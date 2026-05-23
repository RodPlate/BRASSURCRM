import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMobileActions } from '../../context/MobileActionsContext';
import { MOBILE_LAYOUT_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
import FloatingActionButton from './FloatingActionButton';
import MobileBottomNav from './MobileBottomNav';

const CHROME_ROOT_ID = 'crm-mobile-chrome';

export function getMobileChromeRoot() {
  if (typeof document === 'undefined') return null;
  return document.getElementById(CHROME_ROOT_ID) || document.body;
}

/**
 * Shell móvil global: bottom nav + FAB.
 * Portal fuera del árbol de páginas (sin overflow/transform de padres).
 */
export default function GlobalMobileChrome() {
  const isMobileLayout = useMediaQuery(MOBILE_LAYOUT_QUERY);
  const {
    fabOpen,
    setFabOpen,
    openQuickActivity,
    openQuickOpportunity,
    openQuickPhoto,
    openNewSupplier,
  } = useMobileActions();

  useEffect(() => {
    const layout = isMobileLayout ? 'mobile' : 'desktop';
    document.documentElement.dataset.layout = layout;
    return () => {
      if (document.documentElement.dataset.layout === layout) {
        delete document.documentElement.dataset.layout;
      }
    };
  }, [isMobileLayout]);

  useEffect(() => {
    if (!isMobileLayout) setFabOpen(false);
  }, [isMobileLayout, setFabOpen]);

  const chrome = (
    <div className="global-mobile-chrome" data-mobile={isMobileLayout ? 'true' : 'false'}>
      <MobileBottomNav />
      <FloatingActionButton
        open={fabOpen}
        onToggle={() => setFabOpen((v) => !v)}
        onClose={() => setFabOpen(false)}
        onQuickActivity={openQuickActivity}
        onQuickOpportunity={() => openQuickOpportunity()}
        onQuickPhoto={() => openQuickPhoto()}
        onNewSupplier={openNewSupplier}
      />
    </div>
  );

  return createPortal(chrome, getMobileChromeRoot());
}
