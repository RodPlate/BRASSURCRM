/** Rutas de la aplicación (React Router) */
export const ROUTES = {
  dashboard: '/',
  today: '/hoy',
  importSuppliers: '/importar-proveedores',
  suppliers: '/proveedores',
  contacts: '/contactos',
  opportunities: '/oportunidades',
  activities: '/actividades',
  followUps: '/seguimientos',
  intelligence: '/inteligencia',
  dataQuality: '/calidad-datos',
  photoInbox: '/fotos',
};

export const NAV_ITEMS = [
  { to: ROUTES.dashboard, label: 'Dashboard', icon: '◉', end: true },
  { to: ROUTES.photoInbox, label: 'Fotos', icon: '📷' },
  { to: ROUTES.today, label: 'Hoy', icon: '☀' },
  { to: ROUTES.suppliers, label: 'Proveedores', icon: '▣' },
  { to: ROUTES.importSuppliers, label: 'Importar Proveedores', icon: '⬆' },
  { to: ROUTES.contacts, label: 'Contactos', icon: '◎' },
  { to: ROUTES.opportunities, label: 'Oportunidades', icon: '◇' },
  { to: ROUTES.activities, label: 'Actividades', icon: '✎' },
  { to: ROUTES.followUps, label: 'Seguimientos', icon: '◷' },
  { to: ROUTES.intelligence, label: 'Inteligencia', icon: '◈' },
  { to: ROUTES.dataQuality, label: 'Calidad de Datos', icon: '✓' },
];
