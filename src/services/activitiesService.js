import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { auditFieldsForCreate, auditFieldsForUpdate } from '../utils/auditFields';
import { logActivityEvent } from './timelineService';

const COLLECTION = 'activities';

export const subscribeActivities = (callback, onError) => {
  const q = query(collection(db, COLLECTION), orderBy('date', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    (error) => {
      console.error('[activities] onSnapshot:', error);
      if (onError) onError(error);
    }
  );
};

const normalizePayload = (data) => ({
  ...data,
  contactId: data.contactId || null,
  nextFollowUpDate: data.nextFollowUpDate || null,
});

export const createActivity = async (data) => {
  const payload = {
    ...normalizePayload(data),
    ...auditFieldsForCreate(),
  };
  const ref = await addDoc(collection(db, COLLECTION), payload);
  if (data.supplierId) {
    await logActivityEvent(
      data.supplierId,
      ref.id,
      data.type,
      data.summary,
      true
    );
  }
  return ref.id;
};

export const updateActivity = async (id, data) => {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, {
    ...normalizePayload(data),
    ...auditFieldsForUpdate(),
  });
  if (data.supplierId) {
    await logActivityEvent(
      data.supplierId,
      id,
      data.type,
      data.summary,
      false
    );
  }
};

export const deleteActivity = async (id) => {
  await deleteDoc(doc(db, COLLECTION, id));
};
