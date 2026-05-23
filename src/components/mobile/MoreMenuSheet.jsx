import { Link } from 'react-router-dom';
import { MORE_MENU_ITEMS } from '../../constants/routes';

export default function MoreMenuSheet({ open, onClose, onQuickActivity }) {
  if (!open) return null;

  return (
    <div className="sheet-overlay" onClick={onClose} role="presentation">
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Más opciones">
        <div className="sheet__handle" />
        <h3 className="sheet__title">Más</h3>
        <button type="button" className="btn btn--primary btn--block sheet__cta" onClick={() => { onQuickActivity(); onClose(); }}>
          📞 Registrar actividad rápida
        </button>
        <ul className="sheet__links">
          {MORE_MENU_ITEMS.map((item) => (
            <li key={item.to}>
              <Link to={item.to} onClick={onClose}>
                {item.icon} {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn--secondary btn--block" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
