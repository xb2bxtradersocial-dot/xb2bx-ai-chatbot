/**
 * Product repository (Supabase) — catalogue search + admin CRUD.
 */
import { supabase, unwrap, clean } from '../db/supabase.js';

const STOP = new Set(['the', 'a', 'an', 'of', 'for', 'and', 'to', 'in', 'with', 'need', 'want', 'units', 'i']);
function tokens(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

export async function searchProducts(q = {}) {
  const { query, category, limit = 5 } = q;
  let sb = supabase.from('products').select('*');
  if (category) sb = sb.ilike('category', `%${category}%`);
  let rows = unwrap(await sb, 'searchProducts');
  if ((!rows || rows.length === 0) && category) rows = unwrap(await supabase.from('products').select('*'), 'searchProducts.all');

  const qTokens = tokens(query);
  return (rows || [])
    .map((row) => {
      const hay = new Set(tokens(`${row.title} ${row.keywords} ${row.category} ${row.description}`));
      let hits = 0;
      for (const t of qTokens) if (hay.has(t)) hits++;
      const relevance = qTokens.length ? hits / qTokens.length : 0.4;
      return { id: row.id, title: row.title, category: row.category, moq: row.moq, price: row.price, supplier_id: row.supplier_id, match_score: Math.round(relevance * 100) / 100 };
    })
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, limit);
}

// ---- Admin CRUD ----
export async function listProducts({ limit = 200 } = {}) {
  return unwrap(await supabase.from('products').select('*').order('created_at', { ascending: false }).limit(limit), 'listProducts');
}
export async function createProduct(input = {}) {
  const row = {
    id: input.id || 'PRD-' + Date.now(),
    title: input.title || '',
    category: input.category || '',
    description: input.description || '',
    keywords: input.keywords || '',
    moq: Number(input.moq) || 0,
    price: input.price || '',
    supplier_id: input.supplier_id || null
  };
  return unwrap(await supabase.from('products').insert(row).select().single(), 'createProduct');
}
export async function updateProduct(id, patch = {}) {
  return unwrap(await supabase.from('products').update(clean(patch)).eq('id', id).select().single(), 'updateProduct');
}
export async function deleteProduct(id) {
  unwrap(await supabase.from('products').delete().eq('id', id), 'deleteProduct');
  return { id, deleted: true };
}
