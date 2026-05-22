import {
  collection,
  addDoc,
  doc,
  writeBatch,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { getActorEmail } from '../utils/auditFields';
import { activityTypeToTimelineType } from '../utils/timelineHelpers';
import { TIMELINE_TYPES } from '../constants/timelineTypes';

const COLLECTION = 'timeline';

export const buildTimelineEntry = ({
  supplierId,
  type,
  title,
  description = '',
  relatedEntity = null,
  relatedEntityId = null,
  metadata = {},
  user = null,
  date = null,
}) => ({
  supplierId,
  type,
  title: String(title || '').trim(),
  description: String(description || '').trim(),
  user: user || getActorEmail(),
  date: date || serverTimestamp(),
  relatedEntity: relatedEntity || null,
  relatedEntityId: relatedEntityId || null,
  metadata: metadata || {},
  createdAt: serverTimestamp(),
});

export const logTimelineEvent = async (entry) => {
  if (!entry?.type) {
    console.warn('[timeline] Evento omitido: sin type', entry);
    return null;
  }
  const payload = buildTimelineEntry(entry);
  const ref = await addDoc(collection(db, COLLECTION), payload);
  return ref.id;
};

/** Varios eventos en un solo batch (importación masiva). */
export const logTimelineEventsBatch = async (entries) => {
  const valid = entries.filter((e) => e?.supplierId);
  if (!valid.length) return 0;

  const batch = writeBatch(db);
  const col = collection(db, COLLECTION);
  valid.forEach((entry) => {
    const ref = doc(col);
    batch.set(ref, buildTimelineEntry(entry));
  });
  await batch.commit();
  return valid.length;
};

export const subscribeTimelineForSupplier = (supplierId, callback, onError) => {
  const q = query(
    collection(db, COLLECTION),
    where('supplierId', '==', supplierId),
    orderBy('date', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    (error) => {
      console.error('[timeline] onSnapshot:', error);
      if (onError) onError(error);
    }
  );
};

export const addQuickNote = async (supplierId, text) => {
  const description = String(text || '').trim();
  const title = description.split('\n')[0].slice(0, 120) || 'Nota rápida';
  return logTimelineEvent({
    supplierId,
    type: TIMELINE_TYPES.NOTE_QUICK,
    title,
    description,
    relatedEntity: 'note',
  });
};

// —— Helpers de registro automático ——

export const logSupplierCreated = (supplierId, companyName) =>
  logTimelineEvent({
    supplierId,
    type: TIMELINE_TYPES.SUPPLIER_CREATED,
    title: 'Proveedor creado',
    description: companyName,
    relatedEntity: 'supplier',
    relatedEntityId: supplierId,
  });

export const logSupplierImported = (supplierId, companyName) =>
  logTimelineEvent({
    supplierId,
    type: TIMELINE_TYPES.SUPPLIER_IMPORTED,
    title: 'Registro importado desde Excel',
    description: companyName,
    relatedEntity: 'supplier',
    relatedEntityId: supplierId,
    metadata: { source: 'import' },
  });

export const logSupplierUpdated = (supplierId, companyName) =>
  logTimelineEvent({
    supplierId,
    type: TIMELINE_TYPES.SUPPLIER_UPDATED,
    title: 'Datos del proveedor actualizados',
    description: companyName,
    relatedEntity: 'supplier',
    relatedEntityId: supplierId,
  });

export const logSupplierStatusChanged = (supplierId, fromStatus, toStatus) =>
  logTimelineEvent({
    supplierId,
    type: TIMELINE_TYPES.SUPPLIER_STATUS_CHANGED,
    title: `Proveedor pasó a ${toStatus}`,
    description: fromStatus ? `Antes: ${fromStatus}` : '',
    relatedEntity: 'supplier',
    relatedEntityId: supplierId,
    metadata: { fromStatus, toStatus },
  });

export const logContactCreated = (supplierId, contactId, name) =>
  logTimelineEvent({
    supplierId,
    type: TIMELINE_TYPES.CONTACT_CREATED,
    title: `Contacto agregado: ${name}`,
    relatedEntity: 'contact',
    relatedEntityId: contactId,
  });

export const logContactUpdated = (supplierId, contactId, name) =>
  logTimelineEvent({
    supplierId,
    type: TIMELINE_TYPES.CONTACT_UPDATED,
    title: `Contacto actualizado: ${name}`,
    relatedEntity: 'contact',
    relatedEntityId: contactId,
  });

export const logActivityEvent = (supplierId, activityId, activityType, summary, isNew) => {
  const type = activityTypeToTimelineType(activityType);
  const verb = isNew ? 'registrada' : 'actualizada';
  let title = `${activityType} ${verb}`;
  if (type === TIMELINE_TYPES.ACTIVITY_CALL) title = `Llamada ${verb}`;
  if (type === TIMELINE_TYPES.ACTIVITY_WHATSAPP) title = `WhatsApp ${verb}`;
  if (type === TIMELINE_TYPES.ACTIVITY_MEETING) title = `Reunión ${verb}`;
  if (type === TIMELINE_TYPES.ACTIVITY_VISIT) title = isNew ? 'Visita registrada' : 'Visita actualizada';

  return logTimelineEvent({
    supplierId,
    type,
    title,
    description: summary || '',
    relatedEntity: 'activity',
    relatedEntityId: activityId,
    metadata: { activityType },
  });
};

export const logOpportunityCreated = (supplierId, opportunityId, material) =>
  logTimelineEvent({
    supplierId,
    type: TIMELINE_TYPES.OPPORTUNITY_CREATED,
    title: `Oportunidad creada: ${material}`,
    relatedEntity: 'opportunity',
    relatedEntityId: opportunityId,
  });

export const logOpportunityUpdated = (supplierId, opportunityId, material) =>
  logTimelineEvent({
    supplierId,
    type: TIMELINE_TYPES.OPPORTUNITY_UPDATED,
    title: `Oportunidad actualizada: ${material}`,
    relatedEntity: 'opportunity',
    relatedEntityId: opportunityId,
  });

export const logOpportunityStatusChanged = (supplierId, opportunityId, material, fromStatus, toStatus) =>
  logTimelineEvent({
    supplierId,
    type: TIMELINE_TYPES.OPPORTUNITY_STATUS_CHANGED,
    title: `Oportunidad ${material}: ${toStatus}`,
    description: fromStatus ? `Antes: ${fromStatus}` : '',
    relatedEntity: 'opportunity',
    relatedEntityId: opportunityId,
    metadata: { fromStatus, toStatus },
  });
