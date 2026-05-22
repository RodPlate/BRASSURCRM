import {
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  getCountFromServer,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage } from '../firebase/firebase';
import { getActorEmail, getActorDisplayName } from '../utils/auditFields';
import { compressImage, calcReductionPercent, safeFileName } from '../utils/imageCompression';
import { logTimelineEvent } from './timelineService';
import { TIMELINE_TYPES } from '../constants/timelineTypes';
import { VISIT_PHOTO_STATUS } from '../constants/visitPhotoStatus';

const COLLECTION = 'visitPhotos';

const buildAssignedStoragePath = (supplierId, photoId, fileName) =>
  `suppliers/${supplierId}/visits/${photoId}/${fileName}`;

const buildUnassignedStoragePath = (photoId, fileName) =>
  `suppliers/unassigned/${photoId}/${fileName}`;

const isAssignedPhoto = (photo) =>
  photo?.status === VISIT_PHOTO_STATUS.ASSIGNED ||
  (photo?.supplierId && photo?.status !== VISIT_PHOTO_STATUS.PENDING);

/** Nombre garantizado para rutas Storage / Firestore. */
export const resolvePhotoFileName = (compression, sourceFile) => {
  const name = safeFileName(
    compression?.file || sourceFile,
    compression?.fileName
  );
  return name || `foto_${Date.now()}.jpg`;
};

/** Normaliza documento de bandeja (tolerante a datos incompletos). */
export const mapPendingPhotoDoc = (id, data = {}) => {
  const url = data.url || '';
  return {
    id,
    supplierId: data.supplierId ?? '',
    status: data.status ?? VISIT_PHOTO_STATUS.PENDING,
    fileName: data.fileName || 'foto_sin_nombre.jpg',
    url,
    storagePath: data.storagePath || '',
    contentType: data.contentType || 'image/jpeg',
    caption: data.caption || '',
    originalSize: data.originalSize ?? 0,
    compressedSize: data.compressedSize ?? 0,
    compressionRatio: data.compressionRatio ?? data.compressionPercent ?? 0,
    uploadedAt: data.uploadedAt ?? null,
    uploadedBy: data.uploadedBy || '',
    takenAt: data.takenAt ?? null,
    isIncomplete: !url,
  };
};

const ensureCompressionFile = (compression, sourceFile) => {
  const fileName = resolvePhotoFileName(compression, sourceFile);
  const blob = compression?.file || sourceFile;
  const file =
    blob instanceof File && blob.name === fileName
      ? blob
      : new File([blob], fileName, {
          type: 'image/jpeg',
          lastModified: blob?.lastModified || Date.now(),
        });
  return {
    ...compression,
    file,
    fileName,
    originalSize: compression?.originalSize ?? file.size ?? 0,
    compressedSize: compression?.compressedSize ?? file.size ?? 0,
    reductionPercent:
      compression?.reductionPercent ?? compression?.compressionRatio ?? 0,
  };
};

/**
 * Sube archivo a Storage con progreso (0–100).
 */
const uploadToStorageResumable = (storageRef, file, onProgress) =>
  new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, {
      contentType: 'image/jpeg',
    });

    task.on(
      'state_changed',
      (snapshot) => {
        const total = snapshot.totalBytes;
        const percent = total
          ? Math.min(100, Math.round((snapshot.bytesTransferred / total) * 100))
          : 0;
        if (onProgress) onProgress(percent);
      },
      (error) => {
        console.error('[Fotos] uploadBytesResumable:', error);
        reject(error);
      },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        } catch (err) {
          reject(err);
        }
      }
    );
  });

const createPhotoDoc = async ({
  photoId,
  supplierId,
  status,
  url,
  storagePath,
  fileName,
  compression,
  caption = '',
  activityId = null,
  takenAt = null,
  assignedAt = null,
  assignedBy = null,
}) => {
  const photoRef = doc(db, COLLECTION, photoId);
  const uploadedBy = getActorEmail();
  const takenAtValue = takenAt || new Date().toISOString();
  const captionText = String(caption || '').trim();
  const safeName = fileName || resolvePhotoFileName(compression);

  await setDoc(photoRef, {
    supplierId: supplierId || '',
    status,
    activityId: activityId || null,
    url: url || '',
    storagePath: storagePath || '',
    fileName: safeName,
    contentType: 'image/jpeg',
    originalSize: compression.originalSize ?? 0,
    compressedSize: compression.compressedSize ?? 0,
    compressionRatio: compression.reductionPercent ?? 0,
    caption: captionText,
    takenAt: takenAtValue,
    uploadedAt: serverTimestamp(),
    uploadedBy,
    assignedAt: assignedAt || null,
    assignedBy: assignedBy || null,
    updatedAt: serverTimestamp(),
  });

  return { photoRef, photoId, captionText, uploadedBy, fileName: safeName };
};

/** Bandeja: solo pendientes de asignar */
export const subscribePendingVisitPhotos = (callback, onError) => {
  const q = query(
    collection(db, COLLECTION),
    where('status', '==', VISIT_PHOTO_STATUS.PENDING),
    orderBy('uploadedAt', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const photos = snapshot.docs.map((d) => mapPendingPhotoDoc(d.id, d.data()));
      console.log('[Fotos] Bandeja actualizada:', photos.length);
      callback(photos);
    },
    (error) => {
      console.error('[Fotos] Error cargando bandeja:', error);
      if (onError) onError(error);
    }
  );
};

export const getPendingVisitPhotosCount = async () => {
  const q = query(
    collection(db, COLLECTION),
    where('status', '==', VISIT_PHOTO_STATUS.PENDING)
  );
  const snap = await getCountFromServer(q);
  return snap.data().count;
};

/** Ficha proveedor: asignadas por supplierId + status (sin depender de ruta Storage) */
export const subscribeAssignedVisitPhotos = (supplierId, callback, onError) => {
  if (!supplierId) {
    callback([]);
    return () => {};
  }

  let unsub = () => {};

  const emit = (snapshot) => {
    const rows = snapshot.docs
      .map((d) => mapPendingPhotoDoc(d.id, d.data()))
      .filter(isAssignedPhoto)
      .filter((p) => p.url);
    callback(rows);
  };

  const startFallback = () => {
    unsub();
    const fallbackQ = query(
      collection(db, COLLECTION),
      where('supplierId', '==', supplierId),
      orderBy('uploadedAt', 'desc')
    );
    unsub = onSnapshot(
      fallbackQ,
      emit,
      (err) => {
        console.error('[Fotos] assigned fallback:', err);
        if (onError) onError(err);
      }
    );
  };

  const q = query(
    collection(db, COLLECTION),
    where('supplierId', '==', supplierId),
    where('status', '==', VISIT_PHOTO_STATUS.ASSIGNED),
    orderBy('uploadedAt', 'desc')
  );

  unsub = onSnapshot(
    q,
    (snapshot) => {
      const rows = snapshot.docs.map((d) => mapPendingPhotoDoc(d.id, d.data()));
      callback(rows.filter((p) => p.url));
    },
    (error) => {
      console.error('[Fotos] assigned onSnapshot:', error);
      if (error?.code === 'failed-precondition') {
        startFallback();
        return;
      }
      if (onError) onError(error);
    }
  );

  return () => unsub();
};

/** @deprecated usar subscribeAssignedVisitPhotos */
export const subscribeVisitPhotos = subscribeAssignedVisitPhotos;

/** Subida a bandeja (sin proveedor) */
export const uploadPendingVisitPhoto = async ({
  file,
  compression: preCompression = null,
  caption = '',
  onProgress,
}) => {
  if (!file && !preCompression?.file) {
    throw new Error('Archivo obligatorio');
  }

  console.log('[Fotos] Archivo original:', file);

  if (onProgress) onProgress(0);

  let compression = preCompression || (await compressImage(file));
  compression = ensureCompressionFile(compression, file);

  const fileName = compression.fileName;
  console.log('[Fotos] Nombre seguro:', fileName);

  const photoRef = doc(collection(db, COLLECTION));
  const photoId = photoRef.id;
  const storagePath = buildUnassignedStoragePath(photoId, fileName);
  console.log('[Fotos] Storage path:', storagePath);

  const storageRef = ref(storage, storagePath);
  const url = await uploadToStorageResumable(storageRef, compression.file, onProgress);
  console.log('[Fotos] Foto subida:', url);

  const result = await createPhotoDoc({
    photoId,
    supplierId: '',
    status: VISIT_PHOTO_STATUS.PENDING,
    url,
    storagePath,
    fileName,
    compression,
    caption,
  });

  return { id: photoId, url, compression, fileName };
};

/** Subida directa en ficha de proveedor (ya asignada) */
export const uploadVisitPhoto = async ({
  supplierId,
  file,
  compression: preCompression = null,
  caption = '',
  activityId = null,
  takenAt = null,
  onProgress,
}) => {
  if (!supplierId || (!file && !preCompression?.file)) {
    throw new Error('Proveedor y archivo son obligatorios');
  }

  if (onProgress) onProgress(0);

  let compression = preCompression || (await compressImage(file));
  compression = ensureCompressionFile(compression, file);
  const fileName = compression.fileName;

  const photoRef = doc(collection(db, COLLECTION));
  const photoId = photoRef.id;
  const storagePath = buildAssignedStoragePath(supplierId, photoId, fileName);

  const storageRef = ref(storage, storagePath);
  const url = await uploadToStorageResumable(storageRef, compression.file, onProgress);

  const result = await createPhotoDoc({
    photoId,
    supplierId,
    status: VISIT_PHOTO_STATUS.ASSIGNED,
    url,
    storagePath,
    fileName,
    compression,
    caption,
    activityId,
    takenAt,
    assignedAt: serverTimestamp(),
    assignedBy: getActorEmail(),
  });

  const captionText = result.captionText;
  const actor = getActorDisplayName();

  try {
    await logTimelineEvent({
      supplierId,
      type: TIMELINE_TYPES.VISIT_PHOTO_UPLOADED,
      title: 'Foto de visita subida',
      description: `${actor} subió una foto${captionText ? `: ${captionText}` : ''}`,
      relatedEntity: 'visitPhoto',
      relatedEntityId: result.photoId,
      metadata: {
        storagePath,
        activityId: activityId || null,
        originalSize: compression.originalSize,
        compressedSize: compression.compressedSize,
        compressionRatio: compression.reductionPercent,
      },
    });
  } catch (err) {
    console.warn('[Fotos] Timeline no registrado:', err);
  }

  return { id: photoId, url, compression: { ...compression, compressionRatio: compression.reductionPercent } };
};

/** Registrar subida masiva en bandeja */
export const logPendingPhotosUploaded = async (count) => {
  if (!count || count < 1) return null;
  const actor = getActorDisplayName();
  const label = count === 1 ? 'foto' : 'fotos';
  try {
    return await logTimelineEvent({
      supplierId: null,
      type: TIMELINE_TYPES.VISIT_PHOTO_UPLOADED,
      title: 'Fotos subidas a bandeja',
      description: `${actor} subió ${count} ${label}`,
      relatedEntity: 'visitPhoto',
      metadata: { count, inbox: true },
    });
  } catch (err) {
    console.warn('[Fotos] Timeline bandeja:', err);
    return null;
  }
};

/**
 * Asignar foto pendiente — solo Firestore (no mover Storage).
 */
export const assignVisitPhotoToSupplier = async (photo, supplierId, supplierName = '') => {
  if (!supplierId) {
    throw new Error('Debe seleccionar un proveedor');
  }
  if (!photo?.id) {
    throw new Error('Foto inválida');
  }

  const pending =
    photo.status === VISIT_PHOTO_STATUS.PENDING || !photo.status;
  if (!pending && photo.status === VISIT_PHOTO_STATUS.ASSIGNED) {
    throw new Error('La foto ya está asignada');
  }

  console.log('[Fotos] Asignando foto:', photo.id, supplierId);

  const assignedBy = getActorEmail();

  await updateDoc(doc(db, COLLECTION, photo.id), {
    supplierId,
    status: VISIT_PHOTO_STATUS.ASSIGNED,
    assignedAt: serverTimestamp(),
    assignedBy,
    updatedAt: serverTimestamp(),
  });

  const actor = getActorDisplayName();
  const company = supplierName || 'proveedor';

  try {
    await logTimelineEvent({
      supplierId,
      type: TIMELINE_TYPES.VISIT_PHOTO_ASSIGNED,
      title: 'Foto asignada',
      description: `${actor} asignó foto al proveedor ${company}`,
      relatedEntity: 'visitPhoto',
      relatedEntityId: photo.id,
      metadata: {
        storagePath: photo.storagePath || null,
        fileName: photo.fileName || null,
      },
    });
  } catch (err) {
    console.warn('[Fotos] Timeline asignación:', err);
  }

  console.log('[Fotos] Foto asignada correctamente');

  return { id: photo.id, supplierId, status: VISIT_PHOTO_STATUS.ASSIGNED };
};

export const deleteVisitPhoto = async (photo, { supplierName = '', forceDocOnly = false } = {}) => {
  if (!photo?.id) throw new Error('Foto no válida');

  let storageWarning = null;

  if (photo.storagePath && !forceDocOnly) {
    try {
      await deleteObject(ref(storage, photo.storagePath));
    } catch (err) {
      console.error('[Fotos] Error al borrar Storage:', err);
      if (err?.code === 'storage/object-not-found') {
        storageWarning = 'Archivo ya no existía en Storage';
      } else {
        storageWarning = err?.message || 'No se pudo borrar el archivo en Storage';
      }
    }
  }

  await deleteDoc(doc(db, COLLECTION, photo.id));

  const actor = getActorDisplayName();
  const wasPending = photo.status === VISIT_PHOTO_STATUS.PENDING;

  try {
    await logTimelineEvent({
      supplierId: wasPending ? null : photo.supplierId || null,
      type: TIMELINE_TYPES.VISIT_PHOTO_DELETED,
      title: 'Foto eliminada',
      description: wasPending
        ? `${actor} eliminó una foto de la bandeja`
        : `${actor} eliminó una foto${supplierName ? ` del proveedor ${supplierName}` : ''}`,
      relatedEntity: 'visitPhoto',
      relatedEntityId: photo.id,
      metadata: { storagePath: photo.storagePath, wasPending, storageWarning },
    });
  } catch (err) {
    console.warn('[Fotos] Timeline eliminación:', err);
  }

  return { storageWarning };
};

export const calcTotalSavingsPercent = (totalOriginal, totalCompressed) =>
  calcReductionPercent(totalOriginal, totalCompressed);

export const calcTotalSavingsBytes = (totalOriginal, totalCompressed) =>
  Math.max(0, (totalOriginal || 0) - (totalCompressed || 0));
