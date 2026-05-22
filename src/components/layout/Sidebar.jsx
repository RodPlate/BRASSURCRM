import { NavLink } from 'react-router-dom';
import { NAV_ITEMS, ROUTES } from '../../constants/routes';

export default function Sidebar({ mobileOpen = false, onNavigate }) {
  return (
    <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
      <div className="sidebar__brand">
        <h1>CRM BRASSUR</h1>
        <span>Proveedores metálicos</span>
      </div>
      <nav className="sidebar__nav" aria-label="Menú principal">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={item.label}
            className={({ isActive }) =>
              [
                'sidebar__link',
                isActive ? 'sidebar__link--active' : '',
                item.to === ROUTES.importSuppliers ? 'sidebar__link--highlight' : '',
              ].join(' ')
            }
            onClick={onNavigate}
          >
            <span className="sidebar__icon" aria-hidden="true">{item.icon}</span>
            <span className="sidebar__label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar__footer">CRM BRASSUR</div>
    </aside>
  );
}
