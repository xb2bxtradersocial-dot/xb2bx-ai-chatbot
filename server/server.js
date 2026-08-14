/**
 * XB2BX Assistant — server (Claude + Supabase).
 *
 * PUBLIC
 *   GET  /api/health
 *   POST /api/chat            { messages, session_id?, conversation_id? } -> JSON
 *   POST /api/chat/stream     same body -> Server-Sent Events (token-by-token)
 *
 * ADMIN  (Authorization: Bearer <ADMIN_TOKEN>)
 *   POST /api/admin/login                 { token } -> { ok }
 *   GET  /api/admin/stats
 *   Settings:   GET/PUT  /api/admin/settings
 *   Training:   GET /api/admin/knowledge · GET/PUT/DELETE /api/admin/knowledge/:key
 *   Leads:      GET /api/admin/leads · PATCH/DELETE /api/admin/leads/:id
 *   Convos:     GET /api/admin/conversations · GET/PATCH/DELETE /api/admin/conversations/:id
 *   Suppliers:  GET/POST /api/admin/suppliers · PATCH/DELETE /api/admin/suppliers/:id
 *   Products:   GET/POST /api/admin/products · PATCH/DELETE /api/admin/products/:id
 *   RFQs:       GET /api/admin/rfqs · PATCH/DELETE /api/admin/rfqs/:id
 *   Listings:   GET /api/admin/listings · PATCH/DELETE /api/admin/listings/:id
 *   Tickets:    GET /api/admin/tickets · PATCH/DELETE /api/admin/tickets/:id
 *   Escalations:GET /api/admin/escalations · PATCH/DELETE /api/admin/escalations/:id
 */
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG, assertConfig } from './src/config.js';
import { routeAgent, reply, replyStream } from './src/llm.js';
import { AGENTS } from './src/agents.js';
import { getEffectiveConfig } from './src/settings.js';
import { getSettingsForAdmin, updateSettings } from './src/settings.js';
import { listKnowledge, getKnowledge, upsertKnowledge, deleteKnowledge } from './src/knowledge.js';
import { recordTurn, listConversations, getConversation, updateConversation, deleteConversation } from './src/repositories/conversations.js';
import { listLeads, updateLead, deleteLead } from './src/repositories/leads.js';
import { listSuppliers, createSupplier, updateSupplier, deleteSupplier } from './src/repositories/suppliers.js';
import { listProducts, createProduct, updateProduct, deleteProduct } from './src/repositories/products.js';
import { listRfqs, updateRfq, deleteRfq } from './src/repositories/rfqs.js';
import { listListings, updateListing, deleteListing } from './src/repositories/listings.js';
import { listTickets, updateTicket, deleteTicket, listEscalations, updateEscalation, deleteEscalation } from './src/repositories/tickets.js';
import { getStats } from './src/repositories/analytics.js';
import { ensureSeed } from './src/bootstrap.js';
import { verifyLogin, ensureOwner, listAccounts, createAccount, updateAccount, deleteAccount } from './src/repositories/accounts.js';

assertConfig();
ensureSeed();
ensureOwner();

const app = express();
app.use(express.json({ limit: '512kb' }));
const corsOrigin = CONFIG.allowedOrigins.includes('*') ? true : CONFIG.allowedOrigins;
app.use(cors({ origin: corsOrigin, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] }));

// Serve the self-contained widget loader + logo (public/) so any website can
// embed the chatbot with a single <script src=".../widget.js"> tag.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

function textOf(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((c) => (typeof c === 'string' ? c : c?.text || '')).join(' ');
  return '';
}
function requireAdmin(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!CONFIG.adminToken || token !== CONFIG.adminToken) return res.status(401).json({ error: 'unauthorized' });
  next();
}
// Wrap async handlers so rejections become 500s instead of crashing.
const h = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((err) => {
  console.error(`[${req.method} ${req.path}]`, err?.message || err);
  if (!res.headersSent) res.status(500).json({ error: 'server', message: err?.message || 'error' });
});

// ---------------- Public ----------------
app.get('/api/health', h(async (_req, res) => {
  const eff = await getEffectiveConfig();
  res.json({ ok: true, model: eff.mainModel, bot_enabled: eff.botEnabled });
}));

function validateChat(req, res) {
  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Expected { messages: [...] }' });
    return null;
  }
  if (messages.length > 40) {
    res.status(413).json({ error: 'Conversation too long' });
    return null;
  }
  const lastUser = [...messages].reverse().find((m) => m && m.role === 'user');
  if (!lastUser || !textOf(lastUser.content).trim()) {
    res.status(400).json({ error: 'Empty message' });
    return null;
  }
  return req.body;
}

app.post('/api/chat', h(async (req, res) => {
  const body = validateChat(req, res);
  if (!body) return;
  const { messages, session_id, conversation_id, channel } = body;

  const eff = await getEffectiveConfig();
  if (!eff.botEnabled) {
    return res.json({ reply: 'The assistant is temporarily unavailable. Please try again shortly or contact our team.', agent: 'System', actions: [], conversation_id: conversation_id || null });
  }

  const agentKey = await routeAgent(messages);
  const result = await reply(messages, agentKey);

  let convId = conversation_id || null;
  try {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    convId = await recordTurn({ conversation_id, session_id, channel, userText: textOf(lastUser?.content), assistantText: result.reply, agent: result.agent });
  } catch (e) {
    console.error('[persist]', e?.message || e);
  }
  res.json({ ...result, conversation_id: convId });
}));

// Token-by-token streaming via Server-Sent Events.
app.post('/api/chat/stream', h(async (req, res) => {
  const body = validateChat(req, res);
  if (!body) return;
  const { messages, session_id, conversation_id, channel } = body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
  // Writes throw once the client disconnects; guard so a dropped connection
  // never crashes the request.
  const send = (event, data) => {
    if (res.writableEnded) return;
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {
      /* client disconnected mid-stream */
    }
  };

  const eff = await getEffectiveConfig();
  if (!eff.botEnabled) {
    send('token', { token: 'The assistant is temporarily unavailable. Please try again shortly.' });
    send('done', { agent: 'System', conversation_id: conversation_id || null });
    return res.end();
  }

  try {
    const agentKey = await routeAgent(messages);
    send('meta', { agent: AGENTS[agentKey]?.label || 'Assistant' });

    let full = '';
    const result = await replyStream(messages, agentKey, (t) => {
      full += t;
      send('token', { token: t });
    });

    let convId = conversation_id || null;
    try {
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      convId = await recordTurn({ conversation_id, session_id, channel, userText: textOf(lastUser?.content), assistantText: result.reply, agent: result.agent });
    } catch (e) {
      console.error('[persist]', e?.message || e);
    }
    send('done', { agent: result.agent, actions: result.actions, conversation_id: convId, reply: result.reply });
  } catch (err) {
    console.error('[stream]', err?.message || err);
    send('error', { message: "I couldn't complete that just now. Please try again." });
  }
  res.end();
}));

// ---------------- Admin ----------------
app.post('/api/admin/login', h(async (req, res) => {
  const user = await verifyLogin(req.body?.email, req.body?.password || '');
  if (!user) return res.status(401).json({ ok: false, error: 'Invalid email or password' });
  // Hand back the bearer token the panel uses for every subsequent admin call.
  res.json({ ok: true, token: CONFIG.adminToken, user });
}));

// Account management (org staff logins)
app.get('/api/admin/accounts', requireAdmin, h(async (_req, res) => res.json({ accounts: await listAccounts() })));
app.post('/api/admin/accounts', requireAdmin, h(async (req, res) => res.json({ account: await createAccount(req.body || {}) })));
app.patch('/api/admin/accounts/:id', requireAdmin, h(async (req, res) => res.json({ account: await updateAccount(req.params.id, req.body || {}) })));
app.delete('/api/admin/accounts/:id', requireAdmin, h(async (req, res) => res.json(await deleteAccount(req.params.id))));

app.get('/api/admin/stats', requireAdmin, h(async (_req, res) => res.json(await getStats())));

// Settings (chatbot control: Claude key, models, persona, contact, on/off)
app.get('/api/admin/settings', requireAdmin, h(async (_req, res) => res.json({ settings: await getSettingsForAdmin() })));
app.put('/api/admin/settings', requireAdmin, h(async (req, res) => {
  const patch = { ...(req.body || {}) };
  // Don't overwrite the key with the masked display value.
  if (typeof patch.anthropic_api_key === 'string' && patch.anthropic_api_key.includes('…')) delimport { supabase } from './db/supabase.js';
import { CONFIG } from './config.js';

const CACHE_TTL_MS = 10_000;
let cache = null;
let cacheAt = 0;

function parseBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

function parseNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function loadSettingsMap() {
  const now = Date.now();

  if (cache && now - cacheAt < CACHE_TTL_MS) return cache;

  const { data, error } = await supabase
    .from('settings')
    .select('key,value');

  if (error) {
    console.error('[settings] failed to load settings:', error.message);
    return cache || {};
  }

  cache = Object.fromEntries(
    (data || []).map((row) => [row.key, row.value])
  );

  cacheAt = now;
  return cache;
}

export function clearSettingsCache() {
  cache = null;
  cacheAt = 0;
}

export async function getEffectiveConfig() {
  const settings = await loadSettingsMap();

  return {
    botEnabled: parseBool(settings.bot_enabled, true),

    anthropicApiKey:
      settings.anthropic_api_key ||
      CONFIG.anthropicApiKey ||
      '',

    mainModel:
      settings.anthropic_model ||
      CONFIG.mainModel,

    routerModel:
      settings.anthropic_router_model ||
      CONFIG.routerModel,

    temperature: parseNumber(
      settings.temperature,
      CONFIG.temperature
    ),

    maxTokens: parseNumber(
      settings.max_tokens,
      CONFIG.maxTokens
    ),

    personaExtra: settings.persona_extra || '',
    companyName: settings.company_name || 'XB2BX',
    contactEmail: settings.contact_email || '',
    contactPhone: settings.contact_phone || '',
    contactHours: settings.contact_hours || ''
  };
}

export async function getRuntimeSettings() {
  return getEffectiveConfig();
}

export async function getSettingsForAdmin() {
  const settings = await loadSettingsMap();
  const key =
    settings.anthropic_api_key ||
    CONFIG.anthropicApiKey ||
    '';

  return {
    ...settings,
    anthropic_api_key: key
      ? `${key.slice(0, 10)}…${key.slice(-4)}`
      : '',
    anthropic_api_key_set: Boolean(key)
  };
}

export async function updateSettings(updates = {}) {
  const rows = Object.entries(updates).map(([key, value]) => ({
    key,
    value: value === null || value === undefined ? '' : String(value)
  }));

  if (!rows.length) return;

  const { error } = await supabase
    .from('settings')
    .upsert(rows, { onConflict: 'key' });

  if (error) throw error;

  clearSettingsCache();
}
