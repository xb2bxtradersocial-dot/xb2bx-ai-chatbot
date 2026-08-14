const KEY = 'xb2bx_admin_token';
const UKEY = 'xb2bx_admin_user';

export function getToken() {
  return localStorage.getItem(KEY) || '';
}
export function setSession(token, user) {
  localStorage.setItem(KEY, token);
  if (user) localStorage.setItem(UKEY, JSON.stringify(user));
}
export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(UKEY) || 'null');
  } catch {
    return null;
  }
}
export function setUser(user) {
  if (user) localStorage.setItem(UKEY, JSON.stringify(user));
}
export function clearToken() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(UKEY);
}
export function isLoggedIn() {
  return !!getToken();
}
