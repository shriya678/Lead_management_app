import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE_URL });

// Deduplicate concurrent refresh attempts — several requests can 401 at the same time.
let refreshInFlight = null;

function readAuth() {
  const raw = localStorage.getItem('auth');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeAccessToken(newAccessToken) {
  const current = readAuth() || {};
  const next = { ...current, accessToken: newAccessToken };
  localStorage.setItem('auth', JSON.stringify(next));
}

function logoutAndRedirect() {
  localStorage.removeItem('auth');
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

api.interceptors.request.use((config) => {
  const auth = readAuth();
  // Back-compat: pre-refresh-token clients stored the JWT under `token`.
  const accessToken = auth?.accessToken || auth?.token;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;
    const status = err.response?.status;
    const url = originalRequest?.url || '';

    // Don't try to refresh if this WAS the refresh call, or if we've already tried.
    const isAuthEndpoint =
      url.includes('/auth/login') || url.includes('/auth/refresh');

    if (status !== 401 || originalRequest?._retry || isAuthEndpoint) {
      if (status === 401 && !isAuthEndpoint) {
        logoutAndRedirect();
      }
      return Promise.reject(err);
    }

    const auth = readAuth();
    const refreshToken = auth?.refreshToken;
    if (!refreshToken) {
      logoutAndRedirect();
      return Promise.reject(err);
    }

    originalRequest._retry = true;

    try {
      if (!refreshInFlight) {
        // Bare axios (not `api`) so this call skips our interceptor entirely.
        refreshInFlight = axios
          .post(`${BASE_URL}/auth/refresh`, { refreshToken })
          .then((res) => {
            const newAccessToken = res.data.accessToken;
            writeAccessToken(newAccessToken);
            return newAccessToken;
          })
          .finally(() => {
            refreshInFlight = null;
          });
      }

      const newAccessToken = await refreshInFlight;
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshErr) {
      logoutAndRedirect();
      return Promise.reject(refreshErr);
    }
  }
);

export default api;
