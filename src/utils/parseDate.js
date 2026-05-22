/** Inicio del día local (00:00:00). */
export const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Normaliza fechas CRM: Timestamp Firestore, YYYY-MM-DD, Date, ms, vacío.
 * @returns {Date|null} inicio del día local, o null si inválida
 */
export const parseCRMDate = (value) => {
  if (value == null || value === '') return null;

  try {
    if (typeof value?.toDate === 'function') {
      const d = value.toDate();
      return Number.isNaN(d.getTime()) ? null : startOfDay(d);
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : startOfDay(value);
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : startOfDay(d);
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;

      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [y, m, day] = trimmed.split('-').map(Number);
        const d = new Date(y, m - 1, day);
        return Number.isNaN(d.getTime()) ? null : startOfDay(d);
      }

      const d = new Date(trimmed);
      return Number.isNaN(d.getTime()) ? null : startOfDay(d);
    }

    return null;
  } catch {
    return null;
  }
};
