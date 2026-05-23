export const SUPPLIER_TYPES = [
  'Empresa',
  'Industria',
  'Taller',
  'Comercio',
  'Particular',
];

export const SUPPLIER_STATUSES = [
  'Nuevo',
  'Contactado',
  'Interesado',
  'Negociando',
  'Activo',
  'Inactivo',
  'Descartado',
];

export const PRIORITIES = ['Alta', 'Media', 'Baja'];

export const SOURCES = ['Web', 'Referido', 'Visita', 'Base de datos', 'Otro'];

export const ACTIVITY_TYPES = [
  'Llamada',
  'WhatsApp',
  'Email',
  'Visita',
  'Reunión',
  'Oferta',
  'Nota',
];

/** Estados visibles en formulario simplificado */
export const SIMPLIFIED_NEGOTIATION_STATUSES = [
  'Nueva',
  'Negociando',
  'Ganada',
  'Perdida',
];

/** Estados completos (modo avanzado / datos legacy) */
export const NEGOTIATION_STATUSES = [
  'Nueva',
  'En análisis',
  'Cotizando',
  'Negociando',
  'Ganada',
  'Perdida',
  'Pausada',
];

/** Acciones rápidas de actividad (un clic) */
export const QUICK_ACTIVITY_ACTIONS = [
  { type: 'Llamada', label: '📞 Llamé', summary: 'Llamada realizada' },
  { type: 'WhatsApp', label: '📩 WhatsApp', summary: 'Contacto por WhatsApp' },
  { type: 'Visita', label: '🚗 Visité', summary: 'Visita realizada' },
  { type: 'Nota', label: '📝 Nota', summary: 'Nota registrada' },
];

export const CURRENCIES = ['USD', 'PYG'];

export const CURRENCY_LABELS = {
  USD: 'USD — Dólar',
  PYG: 'PYG — Guaraní',
};
