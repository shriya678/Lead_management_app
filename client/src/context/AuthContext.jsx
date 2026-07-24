import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

function readInitial() {
  try {
    const raw = localStorage.getItem('auth');
    return raw ? JSON.parse(raw) : { user: null, token: null };
  } catch {
    return { user: null, token: null };
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readInitial);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const next = { user: res.data.user, token: res.data.token };
    localStorage.setItem('auth', JSON.stringify(next));
    setAuth(next);
    return next.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth');
    setAuth({ user: null, token: null });
  }, []);

  const value = useMemo(
    () => ({
      user: auth.user,
      token: auth.token,
      isAdmin: auth.user?.role === 'admin',
      login,
      logout,
    }),
    [auth, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
