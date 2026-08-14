import { CONFIG } from './config.js';

/** Stable per-browser session id so the backend can group a conversation. */
export function getSessionId() {
  const KEY = 'xb2bx_session_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id =
      (crypto?.randomUUID && crypto.randomUUID()) ||
      'sess-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(KEY, id);
  }
  return id;
}

const STREAM_URL = CONFIG.apiUrl.replace(/\/chat$/, '/chat/stream');

/**
 * Stream a reply token-by-token from the backend (SSE over fetch).
 * Calls handlers as events arrive:
 *   onMeta({agent}), onToken(text), onDone({agent, conversation_id}), onError(msg)
 */
export async function streamMessage({ messages, sessionId, conversationId, onMeta, onToken, onDone, onError }) {
  let res;
  try {
    res = await fetch(STREAM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, session_id: sessionId, conversation_id: conversationId || null })
    });
  } catch {
    return onError?.('Network error — is the backend running?');
  }
  if (!res.ok || !res.body) return onError?.(`Request failed (${res.status})`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  // Parse the SSE stream: events separated by a blank line.
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);

      let event = 'message';
      let data = '';
      for (const line of raw.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (!data) continue;

      let payload;
      try {
        payload = JSON.parse(data);
      } catch {
        continue;
      }
      if (event === 'meta') onMeta?.(payload);
      else if (event === 'token') onToken?.(payload.token || '');
      else if (event === 'done') onDone?.(payload);
      else if (event === 'error') onError?.(payload.message || 'Something went wrong.');
    }
  }
}
