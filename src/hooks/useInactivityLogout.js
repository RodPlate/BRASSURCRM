import { useCallback, useEffect, useRef } from 'react';
import {
  ACTIVITY_EVENTS,
  INACTIVITY_THROTTLE_MS,
  INACTIVITY_TIMEOUT_MS,
} from '../constants/session';

const IMMEDIATE_EVENTS = new Set(['keydown', 'click', 'touchstart', 'scroll']);

/**
 * Cierra sesión tras INACTIVITY_TIMEOUT_MS sin interacción del usuario.
 * mousemove se limita con throttle; el resto de eventos reinicia de inmediato.
 */
export function useInactivityLogout(onInactive) {
  const timeoutRef = useRef(null);
  const lastResetRef = useRef(0);
  const lastActivityAtRef = useRef(Date.now());
  const onInactiveRef = useRef(onInactive);

  useEffect(() => {
    onInactiveRef.current = onInactive;
  }, [onInactive]);

  const clearScheduledLogout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const scheduleLogout = useCallback(() => {
    clearScheduledLogout();
    timeoutRef.current = setTimeout(() => {
      onInactiveRef.current?.();
    }, INACTIVITY_TIMEOUT_MS);
  }, [clearScheduledLogout]);

  const resetInactivityTimer = useCallback(
    (immediate = false) => {
      const now = Date.now();
      if (!immediate && now - lastResetRef.current < INACTIVITY_THROTTLE_MS) {
        return;
      }
      lastResetRef.current = now;
      lastActivityAtRef.current = now;
      scheduleLogout();
    },
    [scheduleLogout]
  );

  const checkElapsedInactivity = useCallback(() => {
    if (Date.now() - lastActivityAtRef.current >= INACTIVITY_TIMEOUT_MS) {
      clearScheduledLogout();
      onInactiveRef.current?.();
    }
  }, [clearScheduledLogout]);

  useEffect(() => {
    const handleActivity = (event) => {
      const immediate = IMMEDIATE_EVENTS.has(event.type);
      resetInactivityTimer(immediate);
    };

    ACTIVITY_EVENTS.forEach((name) => {
      window.addEventListener(name, handleActivity, { passive: true });
    });

    const handleReturnToApp = () => {
      if (document.visibilityState === 'visible') {
        checkElapsedInactivity();
        if (Date.now() - lastActivityAtRef.current < INACTIVITY_TIMEOUT_MS) {
          scheduleLogout();
        }
      }
    };

    document.addEventListener('visibilitychange', handleReturnToApp);
    window.addEventListener('focus', handleReturnToApp);

    resetInactivityTimer(true);

    return () => {
      ACTIVITY_EVENTS.forEach((name) => {
        window.removeEventListener(name, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleReturnToApp);
      window.removeEventListener('focus', handleReturnToApp);
      clearScheduledLogout();
    };
  }, [resetInactivityTimer, scheduleLogout, checkElapsedInactivity, clearScheduledLogout]);
}
