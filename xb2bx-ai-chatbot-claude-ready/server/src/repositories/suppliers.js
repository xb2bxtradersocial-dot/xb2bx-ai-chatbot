/**
 * Supplier repository (Supabase) — matchmaking/ranking + admin CRUD.
 * Candidates are filtered in SQL, then ranked in code so the logic is readable
 * and tunable. To change matchmaking, adjust the weights in W.
 */
import { supabase, unwrap, clean } from '../db/supabase.js';

const W = { relevance: 0.5, verified: 0.2, capacity: 0.15, responsiveness: 0.1, rating: 0.05 };
const STOP = new Set(['the', 'a', 'an', 'of', 'for', 'and', 'to', 'in', 'with', 'need', 'want', 'units', 'i']);

function tokens(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}
function relevanceScore(q, row) {
  if (!q.length) return 0.4;
  const hay = new Set(tokens(`${row.name} ${row.keywords} ${row.categories} ${row.description}`));
  let hits = 0;
  for (const t of q) if (hay.has(t)) hits++;
  return hits / q.length;
}
function capacityScore(row, minQty) {
  if (!minQty) return 0.6;
  if (row.monthly_capacity >= minQty) return 1;
  if (!row.monthly_capacity) return 0.3;
  return Math.max(0.2, row.monthly_capacity / minQty);
}

/** Ranked supplier matches for the assistant. */
export async function searchSuppliers(q = {}) {
  const { product, category, country, min_quantity, limit = 5 } = q;

  let query = supabase.from('suppliers').select('*');
  if (country) query = query.ilike('country', country);
  if (category) query = query.ilike('categories', `%${category}%`);
  let candidates = unwrap(await query, 'searchSuppliers');

  if ((!candidates || candidates.length === 0) && (country || category)) {
    candidates = unwrap(await supabase.from('suppliers').select('*'), 'searchSuppliers.all');
  }

  const qTokens = tokens(product);
  return (candidates || [])
    .map((row) => {
      const score =
        W.relevance * relevanceScore(qTokens, row) +
        W.verified * (row.verified ? 1 : 0) +
        W.capacity * capacityScore(row, min_quantity) +
        W.responsiveness * (row.responsiveness || 0) +
        W.rating * ((row.rating || 0) / 5);
      return {
        id: row.id,
        name: row.name,
        country: row.country,
        verified: !!row.verified,
        monthly_capacity: row.monthly_capacity,
        min_order_qty: row.min_order_qty,
        rating: row.rating,
        match_score: Math.round(score * 100) / 100
      };
    })
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, limit);
}

// ---- Admin CRUD ----
export async function listSuppliers({ limit = 200 } = {}) {
  return unwrap(await supabase.from('suppliers').select('*').order('created_at', { ascending: false }).limit(limit), 'listSuppliers');
}
export async function createSupplier(input = {}) {
  const row = {
    id: input.id || 'SUP-' + Date.now(),
    name: input.name || '',
    country: input.country || '',
    categories: input.categories || '',
    keywords: input.keywords || '',
    description: input.description || '',
    monthly_capacity: Number(input.monthly_capacity) || 0,
    min_order_qty: Number(input.min_order_qty) || 0,
    verified: input.verified ? 1 : 0,
    responsiveness: Number(input.responsiveness) || 0,
    rating: Number(input.rating) || 0
  };
  return unwrap(await supabase.from('suppliers').insert(row).select().single(), 'createSupplier');
}
export async function updateSupplier(id, patch = {}) {
  patch = clean(patch);
  if ('verified' in patch) patch.verified = patch.verified ? 1 : 0;
  return unwrap(await supabase.from('suppliers').update(patch).eq('id', id).select().single(), 'updateSupplier');
}
export async function deleteSupplier(id) {
  unwrap(await supabase.from('suppliers').delete().eq('id', id), 'deleteSupplier');
  return { id, deleted: true };
}
