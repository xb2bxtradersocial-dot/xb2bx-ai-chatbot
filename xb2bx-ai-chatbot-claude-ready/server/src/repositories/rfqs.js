/**
 * RFQ repository (Supabase).
 */
import { supabase, unwrap, clean } from '../db/supabase.js';

export async function createRfq(input = {}) {
  const row = {
    id: 'RFQ-' + Date.now(),
    product: input.product || '',
    quantity: Number(input.quantity) || 0,
    target_country: input.target_country || '',
    delivery_timeline: input.delivery_timeline || '',
    contact_email: input.contact_email || '',
    notes: input.notes || '',
    status: 'created'
  };
  const saved = unwrap(await supabase.from('rfqs').insert(row).select().single(), 'createRfq');
  return { ...saved, next_step: 'RFQ created and routed to matched verified suppliers; quotes return to the buyer.' };
}
export async function listRfqs({ status, limit = 200 } = {}) {
  let q = supabase.from('rfqs').select('*').order('created_at', { ascending: false }).limit(limit);
  if (status) q = q.eq('status', status);
  return unwrap(await q, 'listRfqs');
}
export async function updateRfq(id, patch = {}) {
  return unwrap(await supabase.from('rfqs').update(clean(patch)).eq('id', id).select().single(), 'updateRfq');
}
export async function deleteRfq(id) {
  unwrap(await supabase.from('rfqs').delete().eq('id', id), 'deleteRfq');
  return { id, deleted: true };
}
