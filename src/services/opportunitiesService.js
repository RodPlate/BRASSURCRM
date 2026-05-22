import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { auditFieldsForCreate, auditFieldsForUpdate } from '../utils/auditFields';
import {
  logOpportunityCreated,
  logOpportunityStatusChanged,
  logOpportunityUpdated,
} from './timelineService';

const COLLECTION = 'purchaseOpportunities';

const normalizePayload = (data) => ({
  ...data,
  estimatedVolumeKg: Number(data.estimatedVolumeKg) || 0,
  targetPrice: Number(data.targetPrice) || 0,
  currentOfferPrice: Number(data.currentOfferPrice) || 0,
  probability: data.probability === '' || data.probability == null
    ? null
    : Math.min(100, Math.max(0, Number(data.probability))),
  expectedPurchaseDate: data.expectedPurchaseDate || null,
  currency: data.currency || 'PEN',
});

export const subscribeOpportunities = (callback, onError) => {
  return onSnapshot(
    collection(db, COLLECTION),
    (snapshot) => {
      callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    (error) => {
      console.error('[opportunities] onSnapshot:', error);
      if (onError) onError(error);
    }
  );
};

export const createOpportunity = async (data) => {
  const payload = {
    ...normalizePayload(data),
    ...auditFieldsForCreate(),
  };
  const ref = await addDoc(collection(db, COLLECTION), payload);
  if (data.supplierId) {
    await logOpportunityCreated(data.supplierId, ref.id, data.material);
  }
  return ref.id;
};

export const updateOpportunity = async (id, data, { previous } = {}) => {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, {
    ...normalizePayload(data),
    ...auditFieldsForUpdate(),
  });
  if (!data.supplierId) return;

  const material = data.material || previous?.material || 'Oportunidad';
  await logOpportunityUpdated(data.supplierId, id, material);

  const prevStatus = previous?.negotiationStatus;
  const newStatus = data.negotiationStatus ?? previous?.negotiationStatus;
  if (prevStatus && newStatus && prevStatus !== newStatus) {
    await logOpportunityStatusChanged(
      data.supplierId,
      id,
      material,
      prevStatus,
      newStatus
    );
  }
};

export const deleteOpportunity = async (id) => {
  await deleteDoc(doc(db, COLLECTION, id));
};
