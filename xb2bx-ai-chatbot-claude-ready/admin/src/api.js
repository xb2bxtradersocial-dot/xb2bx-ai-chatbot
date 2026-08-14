import { CONFIG } from './config.js';
import { getToken, clearToken } from './auth.js';

/** Authenticated JSON request to the admin API. */
export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(CONFIG.apiBase + path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: body ? JSON.stringify(body) : undefined
  });

  if (res.status === 401) {
    clearToken();
    if (location.pathname !== '/login') location.href = '/login';
    throw new Error('Session expired — please log in again.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || `Error ${res.status}`);
  return data;
}

/** Login with email + password; returns { token, user }. */
export async function login(email, password) {
  const res = await fetch(CONFIG.apiBase + '/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !data.token) throw new Error(data.error || 'Invalid email or password');
  return { token: data.token, user: data.user || { email, role: 'member' } };
}
