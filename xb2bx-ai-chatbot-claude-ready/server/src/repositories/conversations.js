/**
 * Conversation repository (Supabase) — persist chats for the admin panel.
 */
import { supabase, unwrap, clean } from '../db/supabase.js';

export async function getOrCreateConversation({ conversation_id, session_id, channel = 'web' } = {}) {
  if (conversation_id) {
    const { data } = await supabase.from('conversations').select('*').eq('id', conversation_id).maybeSingle();
    if (data) return data;
  }
  if (session_id) {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('session_id', session_id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }
  const row = { id: 'CONV-' + Date.now(), session_id: session_id || '', channel, agent: '', status: 'open', message_count: 0, last_message: '' };
  return unwrap(await supabase.from('conversations').insert(row).select().single(), 'createConversation');
}

export async function addMessage({ conversation_id, role, agent = '', content = '' }) {
  unwrap(await supabase.from('messages').insert({ conversation_id, role, agent, content }), 'addMessage');
}

/** Record a full turn (user + assistant) and update the conversation summary. */
export async function recordTurn({ conversation_id, session_id, channel, userText, assistantText, agent }) {
  const conv = await getOrCreateConversation({ conversation_id, session_id, channel });
  let added = 0;
  if (userText) { await addMessage({ conversation_id: conv.id, role: 'user', content: userText }); added++; }
  if (assistantText) { await addMessage({ conversation_id: conv.id, role: 'assistant', agent, content: assistantText }); added++; }
  await supabase
    .from('conversations')
    .update({
      agent: agent || conv.agent || '',
      message_count: (conv.message_count || 0) + added,
      last_message: (assistantText || userText || '').slice(0, 280),
      updated_at: new Date().toISOString()
    })
    .eq('id', conv.id);
  return conv.id;
}

export async function listConversations({ status, limit = 100 } = {}) {
  let q = supabase.from('conversations').select('*').order('updated_at', { ascending: false }).limit(limit);
  if (status) q = q.eq('status', status);
  return unwrap(await q, 'listConversations');
}

export async function getConversation(id) {
  const { data: conversation } = await supabase.from('conversations').select('*').eq('id', id).maybeSingle();
  if (!conversation) return null;
  const messages = unwrap(
    await supabase.from('messages').select('id, role, agent, content, created_at').eq('conversation_id', id).order('id', { ascending: true }),
    'getConversation.messages'
  );
  return { ...conversation, messages };
}

export async function updateConversation(id, patch = {}) {
  return unwrap(await supabase.from('conversations').update(clean(patch)).eq('id', id).select().single(), 'updateConversation');
}

export async function deleteConversation(id) {
  await supabase.from('messages').delete().eq('conversation_id', id);
  unwrap(await supabase.from('conversations').delete().eq('id', id), 'deleteConversation');
  return { id, deleted: true };
}
