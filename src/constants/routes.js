/** Rutas de la aplicación (React Router) */
export const ROUTES = {
  dashboard: '/dashboard',
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
  { to: ROUTES.dashboard, label: 'Dashboard', icon: '◉' },
  { to: ROUTES.photoInbox, label: 'Fotos', icon: '📷' },
  { to: ROUTES.today, label: 'Hoy', icon: '☀' },
  { to: ROUTES.suppliers, label: 'Proveedores', icon: '▣' },
  { to: ROUTES.importSuppliers, label: 'Importar Proveedores', icon: '⬆' },
  { to: ROUTES.contacts, label: 'Contactos', icon: '◎' },
  { to: ROUTES.opportunities, label: 'Oportunidades', icon: '◇' },
  { to: ROUTES.activities, label: 'Actividades', icon: '✎' },
  { to: ROUTES.followUps, label: 'Seguimientos', icon: '◷' },
  { to: ROUTES.intelligence, label: 'Inteligencia Comercial', icon: '◈' },
  { to: ROUTES.dataQuality, label: 'Calidad de Datos', icon: '✓' },
];

/** Opciones del menú «Más» (móvil); excluye pestañas del bottom nav */
export const MORE_MENU_ITEMS = [
  { to: ROUTES.dashboard, label: 'Dashboard', icon: '◉' },
  { to: ROUTES.contacts, label: 'Contactos', icon: '◎' },
  { to: ROUTES.activities, label: 'Actividades', icon: '✎' },
  { to: ROUTES.opportunities, label: 'Oportunidades', icon: '◇' },
  { to: ROUTES.followUps, label: 'Seguimientos', icon: '◷' },
  { to: ROUTES.intelligence, label: 'Inteligencia Comercial', icon: '◈' },
  { to: ROUTES.dataQuality, label: 'Calidad de Datos', icon: '✓' },
  { to: ROUTES.importSuppliers, label: 'Importar Proveedores', icon: '⬆' },
];
