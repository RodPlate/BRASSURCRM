import { parseCRMDate } from './parseDate';

/** Siempre devuelve un array. */
export const safeArray = (value) => (Array.isArray(value) ? value : []);

/** Texto seguro; vacío → fallback. */
export const safeString = (value, fallback = '') => {
  if (value == null) return fallback;
  const s = String(value).trim();
  return s || fallback;
};

/** Número finito o fallback. */
export const safeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Fecha normalizada (inicio del día) o null si inválida.
 * Acepta Timestamp, YYYY-MM-DD, Date, vacío.
 */
export const safeDate = (value) => parseCRMDate(value);
