/**
 * Listing repository (Supabase).
 */
import { supabase, unwrap, clean } from '../db/supabase.js';

export async function createListing(input = {}) {
  const row = {
    id: 'LST-' + Date.now(),
    title: input.title || '',
    category: input.category || '',
    description: input.description || '',
    price: input.price || '',
    seller_email: input.seller_email || '',
    status: 'draft'
  };
  const saved = unwrap(await supabase.from('listings').insert(row).select().single(), 'createListing');
  return { ...saved, next_step: 'Draft listing saved for the seller to review and publish.' };
}
export async function listListings({ status, limit = 200 } = {}) {
  let q = supabase.from('listings').select('*').order('created_at', { ascending: false }).limit(limit);
  if (status) q = q.eq('status', status);
  return unwrap(await q, 'listListings');
}
export async function updateListing(id, patch = {}) {
  return unwrap(await supabase.from('listings').update(clean(patch)).eq('id', id).select().single(), 'updateListing');
}
export async function deleteListing(id) {
  unwrap(await supabase.from('listings').delete().eq('id', id), 'deleteListing');
  return { id, deleted: true };
}
