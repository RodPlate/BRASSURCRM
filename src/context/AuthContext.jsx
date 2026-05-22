import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase/firebase';
import { INACTIVITY_MESSAGE } from '../constants/session';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const clearSessionMessage = useCallback(() => {
    setSessionMessage(null);
  }, []);

  const login = async (email, password) => {
    clearSessionMessage();
    return signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const logout = useCallback(async () => {
    clearSessionMessage();
    await signOut(auth);
  }, [clearSessionMessage]);

  const logoutDueToInactivity = useCallback(async () => {
    setSessionMessage(INACTIVITY_MESSAGE);
    try {
      await signOut(auth);
    } catch (err) {
      console.error('[auth] cierre por inactividad:', err);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        sessionMessage,
        clearSessionMessage,
        login,
        logout,
        logoutDueToInactivity,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return ctx;
}
