import {
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  doc,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

const COLLECTION = 'purchaseOpportunities';
const MIGRATION_KEY = 'crm-brassur-currency-pen-pyg-v1';
const BATCH_SIZE = 400;

/**
 * Migra registros legacy currency=PEN → PYG (una sola vez por navegador).
 * @returns {Promise<number>} documentos actualizados
 */
export const migratePENtoPYGOnce = async () => {
  if (typeof localStorage !== 'undefined' && localStorage.getItem(MIGRATION_KEY)) {
    return 0;
  }

  const q = query(collection(db, COLLECTION), where('currency', '==', 'PEN'));
  const snapshot = await getDocs(q);
  const docs = snapshot.docs;

  if (docs.length === 0) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(MIGRATION_KEY, String(Date.now()));
    }
    console.log('[Currency] PEN→PYG migrados:', 0);
    return 0;
  }

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const chunk = docs.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((snap) => {
      batch.update(doc(db, COLLECTION, snap.id), { currency: 'PYG' });
    });
    await batch.commit();
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(MIGRATION_KEY, String(Date.now()));
  }

  console.log('[Currency] PEN→PYG migrados:', docs.length);
  return docs.length;
};
