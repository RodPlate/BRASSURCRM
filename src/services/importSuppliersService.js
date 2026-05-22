import {
  collection,
  doc,
  writeBatch,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { createSupplier } from './suppliersService';
import { logTimelineEventsBatch } from './timelineService';
import { TIMELINE_TYPES } from '../constants/timelineTypes';
import {
  normalizeCompanyKey,
  toSupplierFirestoreDoc,
} from '../utils/importSuppliers';
import { getActorEmail } from '../utils/auditFields';

/** Colección oficial de proveedores (debe coincidir con suppliersService). */
const SUPPLIERS_COLLECTION = 'suppliers';
const CONTACTS_COLLECTION = 'contacts';
const ACTIVITIES_COLLECTION = 'activities';

export const BATCH_SUPPLIER_LIMIT = 400;

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

/** Solo campos válidos para Firestore (sin undefined). */
const buildSupplierPayload = (prepared) => {
  const d = prepared.doc;
  return {
    companyName: String(d.companyName || '').trim(),
    industry: String(d.industry || '').trim(),
    city: String(d.city || '').trim(),
    department: String(d.department || '').trim(),
    generatedMaterials: Array.isArray(d.generatedMaterials)
      ? d.generatedMaterials.filter(Boolean)
      : [],
    estimatedMonthlyVolumeKg: Number(d.estimatedMonthlyVolumeKg) || 0,
    status: d.status || 'Nuevo',
    supplierType: d.supplierType || 'Empresa',
    priority: d.priority || 'Media',
    source: d.source || 'Base Inicial 2026',
    nextFollowUpDate: d.nextFollowUpDate ?? null,
    notes: String(d.notes || '').trim(),
    ruc: String(d.ruc || '').trim(),
    createdBy: getActorEmail(),
    updatedBy: getActorEmail(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
};

const pushFirebaseError = (result, error, context) => {
  const entry = {
    context,
    code: error?.code || 'unknown',
    message: error?.message || String(error),
  };
  result.firebaseErrors.push(entry);
  result.errors.push({
    row: '-',
    companyName: context,
    message: `${entry.code}: ${entry.message}`,
  });
};

const verifySuppliersInFirestore = async () => {
  const suppliersRef = collection(db, SUPPLIERS_COLLECTION);
  const snap = await getDocs(query(suppliersRef, orderBy('companyName', 'asc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/**
 * Guarda un lote de proveedores con writeBatch + commit obligatorio.
 */
const commitSupplierBatch = async (chunk, result) => {
  const suppliersRef = collection(db, SUPPLIERS_COLLECTION);
  const batch = writeBatch(db);
  const refs = [];

  for (const prepared of chunk) {
    const supplierRef = doc(suppliersRef);
    const supplierData = buildSupplierPayload(prepared);
    console.log('Guardando supplier:', supplierData);
    batch.set(supplierRef, supplierData);
    refs.push({ supplierRef, prepared });
  }

  await batch.commit();
  console.log('Batch guardado correctamente');
  result.commitsExecuted += 1;
  result.documentsWritten += chunk.length;
  result.imported += chunk.length;

  try {
    await logTimelineEventsBatch(
      refs.map(({ supplierRef, prepared }) => ({
        supplierId: supplierRef.id,
        type: TIMELINE_TYPES.SUPPLIER_IMPORTED,
        title: 'Registro importado desde Excel',
        description: prepared.doc.companyName,
        relatedEntity: 'supplier',
        relatedEntityId: supplierRef.id,
        metadata: { source: 'import', rowNumber: prepared.rowNumber },
      }))
    );
  } catch (tlErr) {
    console.error('[import] Error registrando timeline:', tlErr);
  }

  return refs;
};

/**
 * Fallback: mismo camino que alta manual (addDoc en "suppliers").
 */
const saveSupplierWithAddDoc = async (prepared, result) => {
  const supplierData = buildSupplierPayload(prepared);
  console.log('Guardando supplier (addDoc):', supplierData);
  const {
    createdAt,
    updatedAt,
    createdBy,
    updatedBy,
    ...dataForCreate
  } = supplierData;
  const id = await createSupplier(dataForCreate, { source: 'import' });
  result.documentsWritten += 1;
  result.imported += 1;
  return { supplierRef: doc(db, SUPPLIERS_COLLECTION, id), prepared };
};

/**
 * Importación por lotes — colección "suppliers", commit real en cada batch.
 */
export const importSupplierRows = async (rows, { onlyNew = true, existingKeys, onProgress } = {}) => {
  const result = {
    totalRead: rows.length,
    imported: 0,
    skippedDuplicates: 0,
    contactsCreated: 0,
    activitiesCreated: 0,
    documentsWritten: 0,
    commitsExecuted: 0,
    batchesSent: 0,
    verifiedInFirestore: 0,
    firebaseErrors: [],
    errors: [],
  };

  const knownKeys = existingKeys instanceof Set ? new Set(existingKeys) : new Set();
  const queue = [];

  for (const row of rows) {
    if (onlyNew && row.isDuplicate) {
      result.skippedDuplicates += 1;
      continue;
    }

    const key = normalizeCompanyKey(row.companyName);
    if (!key) {
      result.errors.push({
        row: row.rowNumber,
        companyName: row.companyName || '(vacío)',
        message: 'Nombre de empresa vacío',
      });
      continue;
    }

    if (knownKeys.has(key)) {
      result.skippedDuplicates += 1;
      continue;
    }

    try {
      const prepared = toSupplierFirestoreDoc(row);
      if (!prepared.doc.companyName) {
        throw new Error('Nombre de empresa vacío tras validación');
      }
      queue.push(prepared);
      knownKeys.add(key);
    } catch (err) {
      result.errors.push({
        row: row.rowNumber,
        companyName: row.companyName,
        message: err?.message || 'Error al preparar fila',
      });
    }
  }

  const totalSteps = queue.length;
  console.log('[import] Filas leídas:', result.totalRead);
  console.log('[import] Filas válidas para importar:', totalSteps);
  console.log('[import] Duplicados omitidos:', result.skippedDuplicates);

  if (!totalSteps) {
    console.log('[import] Nada que guardar en Firestore (cola vacía).');
    return result;
  }

  const importedRefs = [];
  const supplierChunks = chunkArray(queue, BATCH_SUPPLIER_LIMIT);
  let processed = 0;

  for (let c = 0; c < supplierChunks.length; c++) {
    const chunk = supplierChunks[c];

    try {
      const refs = await commitSupplierBatch(chunk, result);
      result.batchesSent += 1;
      importedRefs.push(...refs);
      processed += chunk.length;
      console.log(
        '[import] Batch proveedores',
        c + 1,
        '/',
        supplierChunks.length,
        '— commits:',
        result.commitsExecuted,
        '— docs:',
        result.documentsWritten
      );
      if (onProgress) {
        onProgress(processed, totalSteps, `Proveedores ${processed}/${totalSteps}`);
      }
      await yieldToMain();
    } catch (error) {
      console.error('Error guardando en Firestore:', error);
      alert(error.message || 'Error guardando en Firestore');
      pushFirebaseError(result, error, `Batch proveedores ${c + 1}`);

      for (const prepared of chunk) {
        try {
          const ref = await saveSupplierWithAddDoc(prepared, result);
          importedRefs.push(ref);
          processed += 1;
          if (onProgress) {
            onProgress(processed, totalSteps, prepared.doc.companyName);
          }
        } catch (rowErr) {
          console.error('Error guardando en Firestore:', rowErr);
          alert(rowErr.message || 'Error guardando proveedor');
          pushFirebaseError(result, rowErr, prepared.doc.companyName);
          result.errors.push({
            row: prepared.rowNumber,
            companyName: prepared.doc.companyName,
            message: rowErr?.message || 'Error al guardar proveedor',
          });
        }
        await yieldToMain();
      }
    }
  }

  const contactsRef = collection(db, CONTACTS_COLLECTION);
  const contactItems = importedRefs.filter(({ prepared }) => prepared.contactName);
  const contactChunks = chunkArray(contactItems, BATCH_SUPPLIER_LIMIT);

  for (const chunk of contactChunks) {
    try {
      const batch = writeBatch(db);
      chunk.forEach(({ supplierRef, prepared }) => {
        const contactRef = doc(contactsRef);
        batch.set(contactRef, {
          supplierId: supplierRef.id,
          name: prepared.contactName,
          role: prepared.contactRole || '',
          phone: prepared.phone || '',
          whatsapp: '',
          email: '',
          isMainContact: true,
          notes: 'Importado desde Base Inicial 2026',
          createdBy: getActorEmail(),
          updatedBy: getActorEmail(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      console.log('Batch guardado correctamente');
      result.commitsExecuted += 1;
      result.batchesSent += 1;
      result.contactsCreated += chunk.length;
      try {
        await logTimelineEventsBatch(
          chunk.map(({ supplierRef, prepared }) => ({
            supplierId: supplierRef.id,
            type: TIMELINE_TYPES.CONTACT_CREATED,
            title: `Contacto agregado: ${prepared.contactName}`,
            relatedEntity: 'contact',
            metadata: { source: 'import' },
          }))
        );
      } catch (tlErr) {
        console.error('[import] Timeline contactos:', tlErr);
      }
      await yieldToMain();
    } catch (error) {
      console.error('Error guardando en Firestore:', error);
      alert(error.message || 'Error guardando contactos');
      pushFirebaseError(result, error, 'Batch contactos');
    }
  }

  const activitiesRef = collection(db, ACTIVITIES_COLLECTION);
  const activityItems = importedRefs.filter(({ prepared }) => prepared.lastVisitDate);
  const activityChunks = chunkArray(activityItems, BATCH_SUPPLIER_LIMIT);

  for (const chunk of activityChunks) {
    try {
      const batch = writeBatch(db);
      chunk.forEach(({ supplierRef, prepared }) => {
        const activityRef = doc(activitiesRef);
        batch.set(activityRef, {
          supplierId: supplierRef.id,
          contactId: null,
          type: 'Visita',
          date: prepared.lastVisitDate,
          summary: 'Última visita registrada en importación de base inicial',
          nextAction: '',
          nextFollowUpDate: null,
          createdBy: getActorEmail(),
          updatedBy: getActorEmail(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      console.log('Batch guardado correctamente');
      result.commitsExecuted += 1;
      result.batchesSent += 1;
      result.activitiesCreated += chunk.length;
      try {
        await logTimelineEventsBatch(
          chunk.map(({ supplierRef, prepared }) => ({
            supplierId: supplierRef.id,
            type: TIMELINE_TYPES.ACTIVITY_VISIT,
            title: 'Visita registrada (importación)',
            description: prepared.lastVisitDate
              ? `Última visita: ${prepared.lastVisitDate}`
              : 'Importación base inicial',
            relatedEntity: 'activity',
            metadata: { source: 'import', activityType: 'Visita' },
          }))
        );
      } catch (tlErr) {
        console.error('[import] Timeline actividades:', tlErr);
      }
      await yieldToMain();
    } catch (error) {
      console.error('Error guardando en Firestore:', error);
      alert(error.message || 'Error guardando actividades');
      pushFirebaseError(result, error, 'Batch actividades');
    }
  }

  try {
    const verified = await verifySuppliersInFirestore();
    result.verifiedInFirestore = verified.length;
    console.log('[import] Proveedores verificados en Firestore (colección suppliers):', verified.length);
  } catch (error) {
    console.error('Error guardando en Firestore:', error);
    pushFirebaseError(result, error, 'Verificación post-importación');
  }

  console.log('[import] Completado — importadas:', result.imported);
  console.log('[import] Documentos escritos:', result.documentsWritten);
  console.log('[import] Commits ejecutados:', result.commitsExecuted);
  console.log('[import] Errores:', result.errors.length);

  return result;
};
