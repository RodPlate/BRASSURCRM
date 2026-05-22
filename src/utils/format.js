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
  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatNumber = (value, suffix = '') => {
  if (value == null || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return `${num.toLocaleString('es-PE')}${suffix}`;
};

export const formatCurrency = (value, currency = 'PEN') => {
  if (value == null || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  const code = currency === 'USD' ? 'USD' : 'PEN';
  return num.toLocaleString('es-PE', {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

export const toInputDate = (value) => {
  if (!value) return '';
  const date = value?.toDate?.() ?? new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};
