import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { useMobileActions } from '../../context/MobileActionsContext';
import MoreMenuSheet from './MoreMenuSheet';

const TABS = [
  { to: ROUTES.today, label: 'Hoy', icon: '🏠', end: true },
  { to: ROUTES.suppliers, label: 'Proveedores', icon: '🏭' },
  { to: ROUTES.photoInbox, label: 'Fotos', icon: '📷' },
  { to: ROUTES.activities, label: 'Actividad', icon: '📞' },
];

export default function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const { pathname } = useLocation();
  const { openQuickActivity } = useMobileActions();

  const moreActive = [
    ROUTES.dashboard,
    ROUTES.contacts,
    ROUTES.activities,
    ROUTES.opportunities,
    ROUTES.followUps,
    ROUTES.intelligence,
    ROUTES.dataQuality,
    ROUTES.importSuppliers,
  ].some((p) => pathname === p || pathname.startsWith(`${p}/`));

  return (
    <>
      <nav className="bottom-nav" aria-label="Navegación principal">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`
            }
          >
            <span className="bottom-nav__icon" aria-hidden="true">{tab.icon}</span>
            <span className="bottom-nav__label">{tab.label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          className={`bottom-nav__item ${moreActive ? 'bottom-nav__item--active' : ''}`}
          onClick={() => setMoreOpen(true)}
        >
          <span className="bottom-nav__icon" aria-hidden="true">☰</span>
          <span className="bottom-nav__label">Más</span>
        </button>
      </nav>
      <MoreMenuSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        onQuickActivity={openQuickActivity}
      />
    </>
  );
}
