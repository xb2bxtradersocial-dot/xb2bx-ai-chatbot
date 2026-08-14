/**
 * Supabase client — the single database connection for the whole backend.
 * Uses the service-role key (server-side only, full access). Never expose this
 * key to the browser; the admin panel talks to THIS server, not to Supabase.
 */
import { createClient } from '@supabase/supabase-js';
import { CONFIG } from '../config.js';

export const supabase = createClient(
  CONFIG.supabaseUrl || 'https://placeholder.supabase.co',
  CONFIG.supabaseServiceKey || 'placeholder-key',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

/** Throw a clean error if a Supabase call failed. */
export function unwrap({ data, error }, context = 'query') {
  if (error) {
    const msg = `[supabase:${context}] ${error.message || error}`;
    throw new Error(msg);
  }
  return data;
}

/** Strip immutable / unknown fields from an update patch (prevents PK tampering). */
export function clean(patch = {}) {
  const p = { ...patch };
  delete p.id;
  delete p.created_at;
  delete p.updated_at;
  return p;
}
