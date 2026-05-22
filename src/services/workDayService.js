import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { getActorEmail } from '../utils/auditFields';

const COLLECTION = 'workDayProgress';

export const getTodayDateKey = (date = new Date()) => date.toISOString().split('T')[0];

const docIdForUser = (userEmail, dateKey) => {
  const safe = encodeURIComponent(userEmail || 'sistema');
  return `${safe}_${dateKey}`;
};

const defaultProgress = (userEmail, dateKey) => ({
  user: userEmail,
  date: dateKey,
  completedCount: 0,
  completedKeys: [],
});

export const subscribeWorkDayProgress = (userEmail, callback, onError) => {
  const dateKey = getTodayDateKey();
  const ref = doc(db, COLLECTION, docIdForUser(userEmail, dateKey));

  return onSnapshot(
    ref,
    (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() });
      } else {
        callback(defaultProgress(userEmail, dateKey));
      }
    },
    (error) => {
      console.error('[workDay] onSnapshot:', error);
      if (onError) onError(error);
      callback(defaultProgress(userEmail, dateKey));
    }
  );
};

/** Registra una tarea marcada como realizada hoy (idempotente por taskKey). */
export const recordTaskCompleted = async (userEmail, taskKey) => {
  const email = userEmail || getActorEmail();
  const dateKey = getTodayDateKey();
  const ref = doc(db, COLLECTION, docIdForUser(email, dateKey));
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const keys = snap.data().completedKeys || [];
    if (keys.includes(taskKey)) {
      return snap.data().completedCount ?? keys.length;
    }
    await updateDoc(ref, {
      completedKeys: arrayUnion(taskKey),
      completedCount: increment(1),
      updatedAt: serverTimestamp(),
    });
    return (snap.data().completedCount ?? 0) + 1;
  }

  await setDoc(ref, {
    ...defaultProgress(email, dateKey),
    completedCount: 1,
    completedKeys: [taskKey],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return 1;
};
