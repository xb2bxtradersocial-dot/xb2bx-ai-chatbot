import { supabase } from './db/supabase.js';
import { CONFIG } from './config.js';

const CACHE_TTL_MS = 10_000;

let cache = null;
let cacheAt = 0;

function parseBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

function parseNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function loadSettingsMap() {
  const now = Date.now();

  if (cache && now - cacheAt < CACHE_TTL_MS) {
    return cache;
  }

  const { data, error } = await supabase
    .from('settings')
    .select('key,value');

  if (error) {
    console.error('[settings] failed to load settings:', error.message);
    return cache || {};
  }

  cache = Object.fromEntries(
    (data || []).map((row) => [row.key, row.value])
  );

  cacheAt = now;
  return cache;
}

export function clearSettingsCache() {
  cache = null;
  cacheAt = 0;
}

export async function getRuntimeSettings() {
  const settings = await loadSettingsMap();

  return {
    botEnabled: parseBool(settings.bot_enabled, true),

    anthropicApiKey:
      settings.anthropic_api_key ||
      CONFIG.anthropicApiKey ||
      '',

    mainModel:
      settings.anthropic_model ||
      CONFIG.mainModel,

    routerModel:
      settings.anthropic_router_model ||
      CONFIG.routerModel,

    temperature: parseNumber(
      settings.temperature,
      CONFIG.temperature
    ),

    maxTokens: parseNumber(
      settings.max_tokens,
      CONFIG.maxTokens
    ),

    personaExtra:
      settings.persona_extra || '',

    companyName:
      settings.company_name || 'XB2BX',

    contactEmail:
      settings.contact_email || '',

    contactPhone:
      settings.contact_phone || '',

    contactHours:
      settings.contact_hours || ''
  };
}

export async function updateSettings(updates = {}) {
  const rows = Object.entries(updates).map(([key, value]) => ({
    key,
    value: value === null || value === undefined ? '' : String(value)
  }));

  if (!rows.length) return;

  const { error } = await supabase
    .from('settings')
    .upsert(rows, { onConflict: 'key' });

  if (error) {
    throw error;
  }

  clearSettingsCache();
}
