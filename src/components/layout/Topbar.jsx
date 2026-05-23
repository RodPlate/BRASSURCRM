import { useAuth } from '../../context/AuthContext';
import BrandLogo from '../common/BrandLogo';

export default function Topbar({ title, subtitle, onMenuToggle, menuOpen }) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('[auth] logout:', err);
      alert(err.message || 'No se pudo cerrar sesión');
    }
  };

  return (
    <header className="topbar">
      <div className="topbar__start">
        <button
          type="button"
          className="topbar__menu-btn"
          onClick={onMenuToggle}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
        >
          <span className="topbar__menu-icon" aria-hidden="true" />
        </button>
        <BrandLogo variant="topbar" />
        <div className="topbar__titles">
          <h2 className="topbar__title">{title}</h2>
          {subtitle && <p className="topbar__subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="topbar__meta">
        {user?.email && (
          <span className="topbar__user" title={user.email}>
            {user.email}
          </span>
        )}
        <button
          type="button"
          className="btn btn--secondary btn--sm topbar__logout"
          onClick={handleLogout}
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
