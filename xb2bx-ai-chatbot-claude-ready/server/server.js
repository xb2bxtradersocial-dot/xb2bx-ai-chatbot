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
  if (typeof patch.anthropic_api_key === 'string' && patch.anthropic_api_key.includes('…')) delete patch.anthropic_api_key;
  delete patch.anthropic_api_key_set;
  delete patch.openai_api_key;
  delete patch.openai_api_key_set;
  await updateSettings(patch);
  res.json({ settings: await getSettingsForAdmin() });
}));

// Training (knowledge base)
app.get('/api/admin/knowledge', requireAdmin, h(async (_req, res) => res.json({ knowledge: await listKnowledge() })));
app.get('/api/admin/knowledge/:key', requireAdmin, h(async (req, res) => {
  const k = await getKnowledge(req.params.key);
  if (!k) return res.status(404).json({ error: 'not found' });
  res.json({ knowledge: k });
}));
app.put('/api/admin/knowledge/:key', requireAdmin, h(async (req, res) => res.json({ knowledge: await upsertKnowledge({ ...req.body, key: req.params.key }) })));
app.delete('/api/admin/knowledge/:key', requireAdmin, h(async (req, res) => res.json(await deleteKnowledge(req.params.key))));

// Leads
app.get('/api/admin/leads', requireAdmin, h(async (req, res) => res.json({ leads: await listLeads(req.query) })));
app.patch('/api/admin/leads/:id', requireAdmin, h(async (req, res) => res.json({ lead: await updateLead(req.params.id, req.body || {}) })));
app.delete('/api/admin/leads/:id', requireAdmin, h(async (req, res) => res.json(await deleteLead(req.params.id))));

// Conversations
app.get('/api/admin/conversations', requireAdmin, h(async (req, res) => res.json({ conversations: await listConversations(req.query) })));
app.get('/api/admin/conversations/:id', requireAdmin, h(async (req, res) => {
  const c = await getConversation(req.params.id);
  if (!c) return res.status(404).json({ error: 'not found' });
  res.json({ conversation: c });
}));
app.patch('/api/admin/conversations/:id', requireAdmin, h(async (req, res) => res.json({ conversation: await updateConversation(req.params.id, req.body || {}) })));
app.delete('/api/admin/conversations/:id', requireAdmin, h(async (req, res) => res.json(await deleteConversation(req.params.id))));

// Suppliers (CRUD)
app.get('/api/admin/suppliers', requireAdmin, h(async (req, res) => res.json({ suppliers: await listSuppliers(req.query) })));
app.post('/api/admin/suppliers', requireAdmin, h(async (req, res) => res.json({ supplier: await createSupplier(req.body || {}) })));
app.patch('/api/admin/suppliers/:id', requireAdmin, h(async (req, res) => res.json({ supplier: await updateSupplier(req.params.id, req.body || {}) })));
app.delete('/api/admin/suppliers/:id', requireAdmin, h(async (req, res) => res.json(await deleteSupplier(req.params.id))));

// Products (CRUD)
app.get('/api/admin/products', requireAdmin, h(async (req, res) => res.json({ products: await listProducts(req.query) })));
app.post('/api/admin/products', requireAdmin, h(async (req, res) => res.json({ product: await createProduct(req.body || {}) })));
app.patch('/api/admin/products/:id', requireAdmin, h(async (req, res) => res.json({ product: await updateProduct(req.params.id, req.body || {}) })));
app.delete('/api/admin/products/:id', requireAdmin, h(async (req, res) => res.json(await deleteProduct(req.params.id))));

// RFQs
app.get('/api/admin/rfqs', requireAdmin, h(async (req, res) => res.json({ rfqs: await listRfqs(req.query) })));
app.patch('/api/admin/rfqs/:id', requireAdmin, h(async (req, res) => res.json({ rfq: await updateRfq(req.params.id, req.body || {}) })));
app.delete('/api/admin/rfqs/:id', requireAdmin, h(async (req, res) => res.json(await deleteRfq(req.params.id))));

// Listings
app.get('/api/admin/listings', requireAdmin, h(async (req, res) => res.json({ listings: await listListings(req.query) })));
app.patch('/api/admin/listings/:id', requireAdmin, h(async (req, res) => res.json({ listing: await updateListing(req.params.id, req.body || {}) })));
app.delete('/api/admin/listings/:id', requireAdmin, h(async (req, res) => res.json(await deleteListing(req.params.id))));

// Tickets
app.get('/api/admin/tickets', requireAdmin, h(async (req, res) => res.json({ tickets: await listTickets(req.query) })));
app.patch('/api/admin/tickets/:id', requireAdmin, h(async (req, res) => res.json({ ticket: await updateTicket(req.params.id, req.body || {}) })));
app.delete('/api/admin/tickets/:id', requireAdmin, h(async (req, res) => res.json(await deleteTicket(req.params.id))));

// Escalations
app.get('/api/admin/escalations', requireAdmin, h(async (req, res) => res.json({ escalations: await listEscalations(req.query) })));
app.patch('/api/admin/escalations/:id', requireAdmin, h(async (req, res) => res.json({ escalation: await updateEscalation(req.params.id, req.body || {}) })));
app.delete('/api/admin/escalations/:id', requireAdmin, h(async (req, res) => res.json(await deleteEscalation(req.params.id))));

app.listen(CONFIG.port, () => console.log(`XB2BX Assistant backend (Claude + Supabase) on :${CONFIG.port}`));
