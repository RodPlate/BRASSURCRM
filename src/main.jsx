import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './styles/index.css';
import App from './App.jsx';

const hideSplash = () => {
  const splash = document.getElementById('app-splash');
  if (splash) splash.classList.add('app-splash--hide');
};

registerSW({
  immediate: true,
  onRegistered(registration) {
    console.info('[PWA] Service worker registrado', registration?.scope);
  },
  onRegisterError(error) {
    console.error('[PWA] Error al registrar service worker:', error);
  },
  onOfflineReady() {
    console.info('[PWA] Lista para uso sin conexión (interfaz).');
  },
  onNeedRefresh() {
    console.info('[PWA] Nueva versión disponible; se actualizará al recargar.');
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

requestAnimationFrame(() => {
  hideSplash();
});
