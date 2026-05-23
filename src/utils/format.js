export { formatCurrency } from './currency';

export const formatDate = (value) => {
  if (!value) return '—';
  const date =
    value?.toDate?.() ??
    (typeof value === 'string' || typeof value === 'number'
      ? new Date(value)
      : value instanceof Date
        ? value
        : null);
  if (!date || Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-PY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatNumber = (value, suffix = '') => {
  if (value == null || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return `${num.toLocaleString('es-PY')}${suffix}`;
};

export const toInputDate = (value) => {
  if (!value) return '';
  const date = value?.toDate?.() ?? new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};
