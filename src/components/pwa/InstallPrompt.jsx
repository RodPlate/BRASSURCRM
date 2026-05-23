import { useEffect, useState } from 'react';
import BrandLogo from '../common/BrandLogo';

const DISMISS_KEY = 'pwa-install-dismissed';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsStandalone(standalone);

    if (localStorage.getItem(DISMISS_KEY)) setDismissed(true);

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const onInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  const showIosHint =
    !deferredPrompt &&
    !isStandalone &&
    !dismissed &&
    /iphone|ipad|ipod/i.test(navigator.userAgent);

  if (isStandalone || dismissed) return null;
  if (!deferredPrompt && !showIosHint) return null;

  return (
    <div className="pwa-install" role="region" aria-label="Instalar CRM BRASSUR">
      <BrandLogo variant="pwa" className="pwa-install__logo" />
      <div className="pwa-install__content">
        <strong>Instalar CRM BRASSUR</strong>
        {deferredPrompt ? (
          <p>
            Instálala en tu celular o PC para abrirla como una app, sin pasar por el navegador cada vez.
          </p>
        ) : (
          <p>
            En iPhone: toca <strong>Compartir</strong> y luego <strong>Añadir a pantalla de inicio</strong>.
          </p>
        )}
      </div>
      <div className="pwa-install__actions">
        {deferredPrompt && (
          <button type="button" className="btn btn--primary btn--sm" onClick={handleInstall}>
            Instalar CRM BRASSUR
          </button>
        )}
        <button type="button" className="btn btn--secondary btn--sm" onClick={handleDismiss}>
          Ahora no
        </button>
      </div>
    </div>
  );
}
