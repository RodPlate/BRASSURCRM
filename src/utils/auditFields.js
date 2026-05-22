import { serverTimestamp } from 'firebase/firestore';
import { auth } from '../firebase/firebase';

/** Email del usuario autenticado (o fallback). */
export const getActorEmail = () =>
  auth.currentUser?.email || auth.currentUser?.uid || 'sistema';

/** Nombre corto para mensajes (ej. timeline). */
export const getActorDisplayName = () => {
  const user = auth.currentUser;
  if (user?.displayName?.trim()) return user.displayName.trim();
  const email = user?.email || '';
  const local = email.split('@')[0] || '';
  if (!local) return 'Usuario';
  return local.charAt(0).toUpperCase() + local.slice(1);
};

export const auditFieldsForCreate = () => ({
  createdBy: getActorEmail(),
  updatedBy: getActorEmail(),
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

export const auditFieldsForUpdate = () => ({
  updatedBy: getActorEmail(),
  updatedAt: serverTimestamp(),
});
