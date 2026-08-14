/**
 * Admin accounts — org staff logins for the admin panel.
 *
 * Stored as a JSON array in the existing `settings` table under the key
 * "admin_accounts" (no extra table / DDL needed). The owner account is seeded
 * from ADMIN_EMAIL / ADMIN_PASSWORD on first boot. Login falls back to the env
 * owner if no accounts exist yet.
 */
import { supabase } from '../db/supabase.js';
import { CONFIG } from '../config.js';

export const ACCOUNTS_KEY = 'admin_accounts';
const norm = (e) => (e || '').trim().toLowerCase();

async function readAll() {
  const { data } = await supabase.from('settings').select('value').eq('key', ACCOUNTS_KEY).maybeSingle();
  if (!data || !data.value) return null; // null = not initialised
  try {
    const arr = JSON.parse(data.value);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function writeAll(arr) {
  const { error } = await supabase.from('settings').upsert({ key: ACCOUNTS_KEY, value: JSON.stringify(arr) }, { onConflict: 'key' });
  if (error) throw new Error('[accounts:write] ' + error.message);
}

let counter = 0;
function newId() {
  counter = (counter + 1) % 1000;
  return 'AU-' + Date.now() + '-' + counter;
}

/** Seed the owner account from env if none exist. Idempotent. */
export async function ensureOwner() {
  try {
    const arr = await readAll();
    if ((arr === null || arr.length === 0) && CONFIG.adminEmail && CONFIG.adminPassword) {
      await writeAll([{ id: newId(), email: norm(CONFIG.adminEmail), password: CONFIG.adminPassword, role: 'owner', created_at: new Date().toISOString() }]);
      console.log('[bootstrap] seeded owner admin account.');
    }
  } catch (e) {
    console.error('[bootstrap] ensureOwner skipped:', e?.message || e);
  }
}

/** Verify an email/password login. Returns { email, role } or null. */
export async function verifyLogin(email, password) {
  const em = norm(email);
  let arr = null;
  try {
    arr = await readAll();
  } catch {
    arr = null;
  }
  if (arr && arr.length) {
    const u = arr.find((a) => norm(a.email) === em);
    if (!u) return null;
    return u.password === password ? { email: u.email, role: u.role } : null;
  }
  // Fallback to env owner (before any accounts exist).
  if (em === norm(CONFIG.adminEmail) && password === CONFIG.adminPassword) return { email: em, role: 'owner' };
  return null;
}

// ---- CRUD (admin-only) ----
export async function listAccounts() {
  return (await readAll()) || [];
}

export async function createAccount({ email, password, role = 'member' } = {}) {
  const em = norm(email);
  if (!em || !password) throw new Error('Email and password are required.');
  const arr = (await readAll()) || [];
  if (arr.some((a) => norm(a.email) === em)) throw new Error('An account with this email already exists.');
  const acc = { id: newId(), email: em, password, role: role === 'owner' ? 'owner' : 'member', created_at: new Date().toISOString() };
  arr.push(acc);
  await writeAll(arr);
  return acc;
}

export async function updateAccount(id, patch = {}) {
  const arr = (await readAll()) || [];
  const i = arr.findIndex((a) => String(a.id) === String(id));
  if (i === -1) throw new Error('Account not found.');
  if (patch.email) {
    const em = norm(patch.email);
    if (arr.some((a, j) => j !== i && norm(a.email) === em)) throw new Error('An account with this email already exists.');
    arr[i].email = em;
  }
  if (patch.password) arr[i].password = patch.password;
  if (patch.role) arr[i].role = patch.role === 'owner' ? 'owner' : 'member';
  await writeAll(arr);
  return arr[i];
}

export async function deleteAccount(id) {
  const arr = (await readAll()) || [];
  if (arr.length <= 1) throw new Error('Cannot delete the last remaining account.');
  const next = arr.filter((a) => String(a.id) !== String(id));
  if (next.length === arr.length) throw new Error('Account not found.');
  await writeAll(next);
  return { id, deleted: true };
}
