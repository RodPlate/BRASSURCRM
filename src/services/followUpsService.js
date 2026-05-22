import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { auditFieldsForUpdate } from '../utils/auditFields';

const patch = async (collection, id, fields) => {
  await updateDoc(doc(db, collection, id), {
    ...fields,
    ...auditFieldsForUpdate(),
  });
};

export const markFollowUpComplete = async (item) => {
  if (item.sourceType === 'Proveedor') {
    await patch('suppliers', item.sourceId, { nextFollowUpDate: null });
    return;
  }
  if (item.sourceType === 'Actividad') {
    await patch('activities', item.sourceId, { nextFollowUpDate: null });
    return;
  }
  if (item.sourceType === 'Oportunidad') {
    await patch('purchaseOpportunities', item.sourceId, { expectedPurchaseDate: null });
  }
};

export const rescheduleFollowUp = async (item, dateString) => {
  const value = dateString || null;
  if (item.sourceType === 'Proveedor') {
    await patch('suppliers', item.sourceId, { nextFollowUpDate: value });
    return;
  }
  if (item.sourceType === 'Actividad') {
    await patch('activities', item.sourceId, { nextFollowUpDate: value });
    return;
  }
  if (item.sourceType === 'Oportunidad') {
    await patch('purchaseOpportunities', item.sourceId, { expectedPurchaseDate: value });
  }
};
