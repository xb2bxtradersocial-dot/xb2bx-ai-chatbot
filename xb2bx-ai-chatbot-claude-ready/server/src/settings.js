/** Runtime settings stored in Supabase and editable from the admin panel. */
import { supabase } from './db/supabase.js';
import { CONFIG } from './config.js';

const CACHE_TTL_MS = 8000;
let cache = null;
let cacheAt = 0;

function defaults() {
  return {
    bot_enabled: 'true',
    anthropic_api_key: CONFIG.anthropicApiKey,
    anthropic_model: CONFIG.mainModel,
    anthropic_router_model: CONFIG.routerModel,
    temperature: String(CONFIG.temperature),
    max_tokens: String(CONFIG.maxTokens),
    persona_extra: '',
    company_name: 'XB2BX',
    contact_email: '',
    contact_phone: '',
    contact_hours: ''
  };
}

export async function getSettings({ force = false } = {}) {
  const now = Date.now();
  if (!force && cache && now - cacheAt < CACHE_TTL_MS) return cache;
  const merged = defaults();
  try {
    const { data, error } = await supabase.from('settings').select('key, value');
    if (!error && Array.isArray(data)) for (const row of data) if (row.value !== null && row.value !== undefined) merged[row.key] = row.value;
  } catch {}
  cache = merged;
  cacheAt = now;
  return merged;
}

export async function getEffectiveConfig() {
  const s = await getSettings();
  let temperature = Number(s.temperature);
  if (!Number.isFinite(temperature)) temperature = CONFIG.temperature;
  temperature = Math.min(1, Math.max(0, temperature));
  let maxTokens = parseInt(s.max_tokens, 10);
  if (!Number.isFinite(maxTokens) || maxTokens <= 0) maxTokens = CONFIG.maxTokens;
  maxTokens = Math.min(8000, Math.max(64, maxTokens));

  return {
    botEnabled: s.bot_enabled !== 'false',
    apiKey: s.anthropic_api_key || CONFIG.anthropicApiKey,
    mainModel: (s.anthropic_model || CONFIG.mainModel).trim(),
    routerModel: (s.anthropic_router_model || CONFIG.routerModel).trim(),
    temperature,
    maxTokens,
    personaExtra: s.persona_extra || '',
    contact: { email: s.contact_email, phone: s.contact_phone, hours: s.contact_hours }
  };
}

export async function updateSettings(patch = {}) {
  const rows = Object.entries(patch).map(([key, value]) => ({ key, value: value == null ? '' : String(value) }));
  if (rows.length) {
    const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' });
    if (error) throw new Error('[settings:update] ' + error.message);
  }
  cache = null;
  return getSettings({ force: true });
}

export async function getSettingsForAdmin() {
  const s = await getSettings({ force: true });
  const masked = { ...s };
  delete masked.admin_accounts;
  if (masked.anthropic_api_key) {
    const k = masked.anthropic_api_key;
    masked.anthropic_api_key_set = true;
    masked.anthropic_api_key = k.length > 10 ? `${k.slice(0, 7)}…${k.slice(-4)}` : '••••••';
  } else {
    masked.anthropic_api_key_set = false;
    masked.anthropic_api_key = '';
  }
  // Do not expose legacy OpenAI secrets if they are still in the table.
  delete masked.openai_api_key;
  delete masked.openai_api_key_set;
  return masked;
}
