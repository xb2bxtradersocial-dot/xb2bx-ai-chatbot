# XB2BX Assistant — Backend (OpenAI)

A multi-agent AI chat backend for the XB2BX platform, powered by **OpenAI**. It
implements the core of the AI Ecosystem blueprint: a central knowledge center,
five specialist agents with intent routing, an action/tool layer (supplier
matchmaking, product search, RFQ creation, lead qualification, listings, support
tickets, human handoff), conversation persistence, an admin API, and the XB2BX
compliance + style rules enforced on every reply.

It pairs with the front-end chat widget (in `../client`). The widget talks only to
this backend; this backend holds the API key, knowledge, rules, and data.

## Folder structure

```
server/
  server.js                 Express app — chat + admin API.
  package.json
  .env / .env.example       Config (OpenAI key, models, admin token).
  src/
    config.js               All env-driven settings in one place.
    llm.js                  OpenAI client + intent router + tool-call loop.
    agents.js               The five specialists (instructions, knowledge, tools).
    knowledge.js            The Knowledge Center, in modular sections.
    compliance.js           STYLE (markdown/humanised) + COMPLIANCE guardrails.
    tools.js                Tool schemas (OpenAI format) + executors.
    db/
      index.js              SQLite connection (the adapter boundary).
      schema.sql            All tables (suppliers, products, leads, conversations,
                            messages, rfqs, listings, tickets, escalations).
      seed.js               Sample suppliers + products (npm run seed).
    repositories/           One module per entity — the swappable data layer:
      suppliers.js  products.js  leads.js  rfqs.js  listings.js
      tickets.js    policy.js    conversations.js   analytics.js
```

## Run locally

```bash
npm install
cp .env.example .env        # then paste your OPENAI_API_KEY and set ADMIN_TOKEN
npm run seed                # create + populate suppliers and products
npm start                   # http://localhost:8787
```

Requires **Node 22+** (uses Node's built-in SQLite via `--experimental-sqlite`,
already set in the npm scripts).

## API

### Public

`GET /api/health` → `{ ok, model }`

`POST /api/chat`
```json
{ "messages": [{ "role": "user", "content": "..." }], "session_id": "abc", "conversation_id": null }
```
→ `{ "reply": "...markdown...", "agent": "Trade Advisor", "actions": [...], "conversation_id": "CONV-..." }`

Quick test:
```bash
curl -X POST http://localhost:8787/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"I need 10,000 units of eco-friendly packaging from Vietnam"}]}'
```

### Admin (send `Authorization: Bearer <ADMIN_TOKEN>`)

| Endpoint | Returns |
|---|---|
| `GET /api/admin/stats` | dashboard counts (conversations, leads, rfqs, tickets…) |
| `GET /api/admin/leads?tier=&status=` | captured leads |
| `GET /api/admin/conversations?status=` | conversation list |
| `GET /api/admin/conversations/:id` | one conversation + full messages |
| `GET /api/admin/rfqs?status=` | RFQs |
| `GET /api/admin/listings?status=` | seller listings |
| `GET /api/admin/tickets?status=` | support tickets |
| `GET /api/admin/escalations?status=` | human-handoff queue |

These endpoints are the data source for the admin panel (built in `../client`).

## How it works

1. **Router** (`OPENAI_ROUTER_MODEL`, default `gpt-4o-mini`) classifies the message
   into one of five agents.
2. The chosen **agent** runs on `OPENAI_MODEL` (default `gpt-4o`) with a system
   prompt = relevant knowledge + role + STYLE (markdown/humanised) + COMPLIANCE.
3. The model may call **tools**; executors run server-side against the database and
   return JSON, then the model writes the final markdown reply.
4. Every turn is **persisted** (conversation + messages) for the admin panel.

## Make it production-ready

1. **Knowledge** — replace the `«CONFIRM»` placeholders in `knowledge.js` with the
   client's real categories, plans, pricing, policies, and SLAs.
2. **Database** — to move from SQLite to **Supabase/Postgres**, reimplement the
   queries inside `repositories/*` and the connection in `db/index.js`. Tools,
   agents, server, and the API contract stay unchanged.
3. **Auth** — when tools touch a specific user's data, have the widget send a
   session token and verify it before passing user context into the tools.

## Cost / model notes

OpenAI is pay-as-you-go. The router runs on a small model; replies default to
`gpt-4o`. Set `OPENAI_MODEL=gpt-4o-mini` to run everything cheaply, or point both
models at whatever your account has access to.
