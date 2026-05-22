const statusClass = (status) => {
  const map = {
    Nueva: 'nuevo',
    'En análisis': 'contactado',
    Cotizando: 'interesado',
    Negociando: 'negociando',
    Ganada: 'activo',
    Perdida: 'descartado',
    Pausada: 'inactivo',
  };
  return map[status] || 'inactivo';
};

export default function NegotiationBadge({ value }) {
  if (!value) return <span>—</span>;
  return <span className={`badge badge--${statusClass(value)}`}>{value}</span>;
}
