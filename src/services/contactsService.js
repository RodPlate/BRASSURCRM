import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { auditFieldsForCreate, auditFieldsForUpdate } from '../utils/auditFields';
import { logContactCreated, logContactUpdated } from './timelineService';

const COLLECTION = 'contacts';

export const subscribeContacts = (callback, onError) => {
  const q = query(collection(db, COLLECTION), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    (error) => {
      console.error('[contacts] onSnapshot:', error);
      if (onError) onError(error);
    }
  );
};

async function clearOtherMainContacts(supplierId, exceptId) {
  const q = query(
    collection(db, COLLECTION),
    where('supplierId', '==', supplierId),
    where('isMainContact', '==', true)
  );
  const snapshot = await getDocs(q);
  const updates = snapshot.docs
    .filter((d) => d.id !== exceptId)
    .map((d) =>
      updateDoc(doc(db, COLLECTION, d.id), {
        isMainContact: false,
        ...auditFieldsForUpdate(),
      })
    );
  await Promise.all(updates);
}

export const createContact = async (data) => {
  const isMain = Boolean(data.isMainContact);
  const payload = {
    ...data,
    isMainContact: isMain,
    ...auditFieldsForCreate(),
  };
  const ref = await addDoc(collection(db, COLLECTION), payload);
  if (isMain && data.supplierId) {
    await clearOtherMainContacts(data.supplierId, ref.id);
  }
  if (data.supplierId) {
    await logContactCreated(data.supplierId, ref.id, data.name);
  }
  return ref.id;
};

export const updateContact = async (id, data) => {
  const isMain = Boolean(data.isMainContact);
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, {
    ...data,
    isMainContact: isMain,
    ...auditFieldsForUpdate(),
  });
  if (isMain && data.supplierId) {
    await clearOtherMainContacts(data.supplierId, id);
  }
  if (data.supplierId) {
    await logContactUpdated(data.supplierId, id, data.name);
  }
};

export const setMainContact = async (contact) => {
  const { id, createdAt, updatedAt, createdBy, updatedBy, ...data } = contact;
  await updateContact(id, { ...data, isMainContact: true });
};

export const deleteContact = async (id) => {
  await deleteDoc(doc(db, COLLECTION, id));
};
