import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { useMobileActions } from '../../context/MobileActionsContext';
import { MOBILE_LAYOUT_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
import MoreMenuSheet from './MoreMenuSheet';

const TABS = [
  { to: ROUTES.today, label: 'Hoy', icon: '🏠', end: true },
  { to: ROUTES.suppliers, label: 'Proveedores', icon: '🏭' },
  { to: ROUTES.photoInbox, label: 'Fotos', icon: '📷' },
];

const MORE_ACTIVE_PATHS = [
  ROUTES.dashboard,
  ROUTES.contacts,
  ROUTES.activities,
  ROUTES.opportunities,
  ROUTES.followUps,
  ROUTES.intelligence,
  ROUTES.dataQuality,
  ROUTES.importSuppliers,
];

/** Barra inferior global — siempre montada; visibilidad solo por CSS */
export default function MobileBottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const { pathname } = useLocation();
  const { openQuickActivity } = useMobileActions();
  const isMobileLayout = useMediaQuery(MOBILE_LAYOUT_QUERY);

  useEffect(() => {
    if (isMobileLayout) {
      console.log('[MobileNav] section:', pathname);
    }
  }, [isMobileLayout, pathname]);

  const moreActive = MORE_ACTIVE_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  return (
    <>
      <nav className="mobile-bottom-nav" aria-label="Navegación principal móvil">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `mobile-bottom-nav__item ${isActive ? 'mobile-bottom-nav__item--active' : ''}`
            }
          >
            <span className="mobile-bottom-nav__icon" aria-hidden="true">{tab.icon}</span>
            <span className="mobile-bottom-nav__label">{tab.label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          className={`mobile-bottom-nav__item ${moreActive ? 'mobile-bottom-nav__item--active' : ''}`}
          aria-expanded={moreOpen}
          aria-haspopup="dialog"
          onClick={() => setMoreOpen(true)}
        >
          <span className="mobile-bottom-nav__icon" aria-hidden="true">☰</span>
          <span className="mobile-bottom-nav__label">Más</span>
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
