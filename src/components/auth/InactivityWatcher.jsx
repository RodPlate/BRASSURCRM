import { useAuth } from '../../context/AuthContext';
import { useInactivityLogout } from '../../hooks/useInactivityLogout';

/** Activo solo con sesión iniciada; no afecta login ni PWA. */
export default function InactivityWatcher() {
  const { logoutDueToInactivity } = useAuth();
  useInactivityLogout(logoutDueToInactivity);
  return null;
}
