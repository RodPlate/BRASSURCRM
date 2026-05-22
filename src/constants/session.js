/** Tiempo máximo sin actividad antes de cerrar sesión (6 horas). */
export const INACTIVITY_TIMEOUT_MS = 6 * 60 * 60 * 1000;

export const INACTIVITY_MESSAGE = 'Sesión cerrada por seguridad';

/** Evita reiniciar el temporizador en cada mousemove (rendimiento). */
export const INACTIVITY_THROTTLE_MS = 30 * 1000;

export const ACTIVITY_EVENTS = [
  'mousemove',
  'keydown',
  'click',
  'touchstart',
  'scroll',
];
