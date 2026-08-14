/**
 * Leads repository (Supabase) — capture, score, persist, and admin manage.
 */
import { supabase, unwrap, clean } from '../db/supabase.js';

const SIGNALS = { budget: 30, volume: 25, timeline: 25, location: 20 };
const QUALIFIED_AT = 60;

function scoreLead(input) {
  let score = 0;
  for (const [key, points] of Object.entries(SIGNALS)) {
    if (input[key] && String(input[key]).trim()) score += points;
  }
  const tier = score >= 75 ? 'hot' : score >= QUALIFIED_AT ? 'warm' : 'cold';
  return { score, tier, qualified: score >= QUALIFIED_AT ? 1 : 0 };
}

/** Capture + score a lead. Returns the stored record. */
export async function createLead(input = {}) {
  const { score, tier, qualified } = scoreLead(input);
  const row = {
    id: 'LEAD-' + Date.now(),
    name: input.name || '',
    email: input.email || '',
    interest: input.interest || '',
    volume: input.volume || '',
    budget: input.budget || '',
    location: input.location || '',
    timeline: input.timeline || '',
    score,
    tier,
    qualified
  };
  const saved = unwrap(await supabase.from('leads').insert(row).select().single(), 'createLead');
  const next_step = qualified
    ? 'Qualified — offer a supplier introduction or membership and escalate to the team.'
    : 'Not yet qualified — gather budget, volume, timeline, or location to progress.';
  return { ...saved, qualified: !!qualified, next_step };
}

export async function listLeads({ tier, status, limit = 200 } = {}) {
  let q = supabase.from('leads').select('*').order('score', { ascending: false }).order('created_at', { ascending: false }).limit(limit);
  if (tier) q = q.eq('tier', tier);
  if (status) q = q.eq('status', status);
  return unwrap(await q, 'listLeads');
}
export async function updateLead(id, patch = {}) {
  return unwrap(await supabase.from('leads').update(clean(patch)).eq('id', id).select().single(), 'updateLead');
}
export async function deleteLead(id) {
  unwrap(await supabase.from('leads').delete().eq('id', id), 'deleteLead');
  return { id, deleted: true };
}
