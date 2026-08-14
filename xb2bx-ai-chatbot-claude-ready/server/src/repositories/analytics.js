/**
 * Analytics (Supabase) — aggregate counts for the admin dashboard.
 */
import { supabase } from '../db/supabase.js';

async function count(table, filters = []) {
  let q = supabase.from(table).select('*', { count: 'exact', head: true });
  for (const [col, val] of filters) q = q.eq(col, val);
  const { count: n } = await q;
  return n || 0;
}

export async function getStats() {
  const [
    conversations, messages, leadsTotal, leadsQualified, leadsHot, leadsWarm, leadsCold,
    rfqs, listings, ticketsTotal, ticketsOpen, escalations, suppliers, products
  ] = await Promise.all([
    count('conversations'),
    count('messages'),
    count('leads'),
    count('leads', [['qualified', 1]]),
    count('leads', [['tier', 'hot']]),
    count('leads', [['tier', 'warm']]),
    count('leads', [['tier', 'cold']]),
    count('rfqs'),
    count('listings'),
    count('support_tickets'),
    count('support_tickets', [['status', 'open']]),
    count('escalations'),
    count('suppliers'),
    count('products')
  ]);

  return {
    conversations,
    messages,
    leads: { total: leadsTotal, qualified: leadsQualified, hot: leadsHot, warm: leadsWarm, cold: leadsCold },
    rfqs,
    listings,
    tickets: { total: ticketsTotal, open: ticketsOpen },
    escalations,
    suppliers,
    products,
    generated_at: new Date().toISOString()
  };
}
