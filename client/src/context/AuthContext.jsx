import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

function readInitial() {
  try {
    const raw = localStorage.getItem('auth');
    if (!raw) return { user: null, accessToken: null, refreshToken: null };
    const parsed = JSON.parse(raw);
    // Back-compat: older shape used `token` instead of accessToken/refreshToken.
    if (parsed.token && !parsed.accessToken) {
      return {
        user: parsed.user || null,
        accessToken: parsed.token,
        refreshToken: null,
      };
    }
    return {
      user: parsed.user || null,
      accessToken: parsed.accessToken || null,
      refreshToken: parsed.refreshToken || null,
    };
  } catch {
    return { user: null, accessToken: null, refreshToken: null };
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readInitial);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const next = {
      user: res.data.user,
      accessToken: res.data.accessToken,
      refreshToken: res.data.refreshToken,
    };
    localStorage.setItem('auth', JSON.stringify(next));
    setAuth(next);
    return next.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth');
    setAuth({ user: null, accessToken: null, refreshToken: null });
  }, []);

  const value = useMemo(
    () => ({
      user: auth.user,
      token: auth.accessToken, // kept as `token` for back-compat with existing consumers
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
