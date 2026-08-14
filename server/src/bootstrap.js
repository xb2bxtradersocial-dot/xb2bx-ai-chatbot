/**
 * First-boot seeding — populate settings + knowledge from code defaults if those
 * tables are empty. Keeps the rich default knowledge in code as the single source
 * of truth while letting the admin edit it in the DB afterwards. Idempotent.
 */
import { supabase } from './db/supabase.js';
import { CONFIG } from './config.js';
import { DEFAULT_KNOWLEDGE } from './knowledge.js';

export async function ensureSeed() {
  if (!CONFIG.supabaseUrl || !CONFIG.supabaseServiceKey) return;

  try {
    // Settings
    const { count: settingsCount } = await supabase
      .from('settings')
      .select('*', { count: 'exact', head: true });

    if (!settingsCount) {
      const defaults = {
        bot_enabled: 'true',
        anthropic_model: CONFIG.mainModel,
        anthropic_router_model: CONFIG.routerModel,
        temperature: String(CONFIG.temperature),
        max_tokens: String(CONFIG.maxTokens),
        persona_extra: '',
        company_name: 'XB2BX',
        contact_email: '',
        contact_phone: '',
        contact_hours: '',
        anthropic_api_key: CONFIG.anthropicApiKey || ''
      };

      const rows = Object.entries(defaults).map(([key, value]) => ({
        key,
        value
      }));

      await supabase.from('settings').upsert(rows, { onConflict: 'key' });
      console.log(`[bootstrap] seeded ${rows.length} settings.`);
    }

    // Knowledge
    const { count: kCount } = await supabase
      .from('knowledge')
      .select('*', { count: 'exact', head: true });

    if (!kCount) {
      const rows = Object.entries(DEFAULT_KNOWLEDGE).map(([key, v]) => ({
        key,
        title: v.title,
        content: v.content,
        enabled: true
      }));

      await supabase.from('knowledge').upsert(rows, { onConflict: 'key' });
      console.log(`[bootstrap] seeded ${rows.length} knowledge sections.`);
    }
  } catch (e) {
    console.error('[bootstrap] seed skipped:', e?.message || e);
  }
}
