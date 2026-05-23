/** Monedas soportadas — CRM BRASSUR (Paraguay) */
export const DEFAULT_CURRENCY = 'USD';

export const CURRENCY_CODES = ['USD', 'PYG'];

export const CURRENCY_LABELS = {
  USD: 'USD — Dólar',
  PYG: 'PYG — Guaraní',
};

/** Normaliza código guardado (incluye legado PEN → PYG). */
export const normalizeCurrency = (currency) => {
  const code = String(currency || '').trim().toUpperCase();
  if (code === 'PEN' || code === 'SOL') return 'PYG';
  if (code === 'PYG') return 'PYG';
  if (code === 'USD') return 'USD';
  return DEFAULT_CURRENCY;
};

/**
 * Formato de montos:
 * PYG → Gs. 1.250.000 (es-PY)
 * USD → US$ 1,250.00 (en-US)
 */
export const formatCurrency = (value, currency = DEFAULT_CURRENCY) => {
  if (value == null || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';

  const code = normalizeCurrency(currency);

  if (code === 'USD') {
    const amount = num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `US$ ${amount}`;
  }

  const amount = Math.round(num).toLocaleString('es-PY', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `Gs. ${amount}`;
};
