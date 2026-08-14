/** Bootstrap configuration. Runtime AI settings can be changed from the admin panel. */
import 'dotenv/config';

export const CONFIG = {
  port: Number(process.env.PORT || 8787),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim()).filter(Boolean),

  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  mainModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
  routerModel: process.env.ANTHROPIC_ROUTER_MODEL || 'claude-sonnet-4-20250514',
  temperature: Number(process.env.TEMPERATURE ?? 0.6),
  maxTokens: Number(process.env.MAX_TOKENS || 1400),
  maxToolHops: Number(process.env.MAX_TOOL_HOPS || 6),

  adminToken: process.env.ADMIN_TOKEN || '',
  adminEmail: (process.env.ADMIN_EMAIL || 'admin@gmail.com').trim().toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || 'admin@123!'
};

export function assertConfig() {
  if (!CONFIG.supabaseUrl || !CONFIG.supabaseServiceKey) {
    console.warn('\n[config] WARNING: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set. Database calls will fail until configured.\n');
  }
  if (!CONFIG.adminToken) console.warn('[config] WARNING: ADMIN_TOKEN not set — the admin panel will reject all logins.');
}
