const statusClass = (status) => {
  const map = {
    Nuevo: 'nuevo',
    Contactado: 'contactado',
    Interesado: 'interesado',
    Negociando: 'negociando',
    Activo: 'activo',
    Inactivo: 'inactivo',
    Descartado: 'descartado',
    Alta: 'alta',
    Media: 'media',
    Baja: 'baja',
  };
  return map[status] || 'inactivo';
};

export default function StatusBadge({ value, type = 'status' }) {
  if (!value) return <span>—</span>;
  const cls = type === 'priority' ? statusClass(value) : statusClass(value);
  return <span className={`badge badge--${cls}`}>{value}</span>;
}
