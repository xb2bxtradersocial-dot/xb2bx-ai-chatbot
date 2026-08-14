/**
 * Support repository (Supabase) — support tickets + human-handoff escalations.
 */
import { supabase, unwrap, clean } from '../db/supabase.js';

export async function createTicket(input = {}) {
  const row = {
    id: 'TKT-' + Date.now(),
    subject: input.subject || '',
    description: input.description || '',
    contact_email: input.contact_email || '',
    priority: ['low', 'normal', 'high'].includes(input.priority) ? input.priority : 'normal',
    status: 'open'
  };
  const saved = unwrap(await supabase.from('support_tickets').insert(row).select().single(), 'createTicket');
  return { ...saved, next_step: 'Ticket opened. The team will follow up; share the ticket id with the user.' };
}
export async function createEscalation(input = {}) {
  const row = {
    id: 'ESC-' + Date.now(),
    reason: input.reason || '',
    contact_email: input.contact_email || '',
    contact_phone: input.contact_phone || '',
    status: 'queued'
  };
  const saved = unwrap(await supabase.from('escalations').insert(row).select().single(), 'createEscalation');
  return { ...saved, queue: 'live-agents', next_step: 'Escalated to a human agent. Reassure the user that the team will reach out.' };
}

export async function listTickets({ status, limit = 200 } = {}) {
  let q = supabase.from('support_tickets').select('*').order('created_at', { ascending: false }).limit(limit);
  if (status) q = q.eq('status', status);
  return unwrap(await q, 'listTickets');
}
export async function updateTicket(id, patch = {}) {
  return unwrap(await supabase.from('support_tickets').update(clean(patch)).eq('id', id).select().single(), 'updateTicket');
}
export async function deleteTicket(id) {
  unwrap(await supabase.from('support_tickets').delete().eq('id', id), 'deleteTicket');
  return { id, deleted: true };
}

export async function listEscalations({ status, limit = 200 } = {}) {
  let q = supabase.from('escalations').select('*').order('created_at', { ascending: false }).limit(limit);
  if (status) q = q.eq('status', status);
  return unwrap(await q, 'listEscalations');
}
export async function updateEscalation(id, patch = {}) {
  return unwrap(await supabase.from('escalations').update(clean(patch)).eq('id', id).select().single(), 'updateEscalation');
}
export async function deleteEscalation(id) {
  unwrap(await supabase.from('escalations').delete().eq('id', id), 'deleteEscalation');
  return { id, deleted: true };
}
