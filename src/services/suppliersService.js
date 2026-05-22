import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { auditFieldsForCreate, auditFieldsForUpdate } from '../utils/auditFields';
import {
  logSupplierCreated,
  logSupplierImported,
  logSupplierStatusChanged,
  logSupplierUpdated,
} from './timelineService';

const COLLECTION = 'suppliers';

export const fetchAllSuppliers = async () => {
  const q = query(collection(db, COLLECTION), orderBy('companyName', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const subscribeSuppliers = (callback, onError) => {
  const q = query(collection(db, COLLECTION), orderBy('companyName', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(data);
    },
    (error) => {
      console.error('[suppliers] onSnapshot:', error);
      if (onError) onError(error);
    }
  );
};

export const createSupplier = async (data, { source = 'manual' } = {}) => {
  const payload = {
    ...data,
    estimatedMonthlyVolumeKg: Number(data.estimatedMonthlyVolumeKg) || 0,
    ...auditFieldsForCreate(),
  };
  const ref = await addDoc(collection(db, COLLECTION), payload);
  const name = data.companyName || payload.companyName;
  if (source === 'import') {
    await logSupplierImported(ref.id, name);
  } else {
    await logSupplierCreated(ref.id, name);
  }
  return ref.id;
};

export const updateSupplier = async (id, data, { previous } = {}) => {
  const ref = doc(db, COLLECTION, id);
  const patch = {
    ...data,
    ...auditFieldsForUpdate(),
  };
  if (data.estimatedMonthlyVolumeKg !== undefined) {
    patch.estimatedMonthlyVolumeKg = Number(data.estimatedMonthlyVolumeKg) || 0;
  }
  await updateDoc(ref, patch);

  const name = data.companyName || previous?.companyName || '';
  await logSupplierUpdated(id, name);

  const prevStatus = previous?.status;
  const newStatus = data.status ?? previous?.status;
  if (prevStatus && newStatus && prevStatus !== newStatus) {
    await logSupplierStatusChanged(id, prevStatus, newStatus);
  }
};

export const deleteSupplier = async (id) => {
  await deleteDoc(doc(db, COLLECTION, id));
};
