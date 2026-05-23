import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import BrandLogo from '../../components/common/BrandLogo';
import { BRAND_TITLE } from '../../constants/branding';
import '../../styles/login.css';

const AUTH_ERRORS = {
  'auth/invalid-email': 'Correo electrónico no válido.',
  'auth/user-disabled': 'Usuario deshabilitado.',
  'auth/user-not-found': 'Usuario o contraseña incorrectos.',
  'auth/wrong-password': 'Usuario o contraseña incorrectos.',
  'auth/invalid-credential': 'Usuario o contraseña incorrectos.',
  'auth/too-many-requests': 'Demasiados intentos. Intente más tarde.',
  'auth/network-request-failed': 'Sin conexión. Verifique su red.',
};

export default function LoginPage() {
  const { login, sessionMessage, clearSessionMessage } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
    } catch (err) {
      const message =
        AUTH_ERRORS[err?.code] || err?.message || 'No se pudo iniciar sesión.';
      setError(message);
      console.error('[auth] login:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__brand">
          <div className="login-card__logo-wrap">
            <BrandLogo variant="login" />
          </div>
          <h1>{BRAND_TITLE}</h1>
          <p>Acceso para usuarios autorizados</p>
        </div>

        {sessionMessage && (
          <div className="alert alert--warning login-form__notice" role="alert">
            {sessionMessage}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="login-email">Correo electrónico</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                if (sessionMessage) clearSessionMessage();
                setEmail(e.target.value);
              }}
              required
              disabled={submitting}
            />
          </div>

          <div className="form-field">
            <label htmlFor="login-password">Contraseña</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          {error && (
            <div className="alert alert--error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn--primary login-form__submit"
            disabled={submitting}
          >
            {submitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
