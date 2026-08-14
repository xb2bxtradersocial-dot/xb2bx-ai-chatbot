# XB2BX AI Chatbot

Multi-agent AI chatbot for the **XB2BX** cross-border B2B marketplace — supplier
matchmaking, product search, RFQs, lead capture, support, and a full admin panel.
Built with **OpenAI** (streaming) + **Supabase**, a **React** chat widget, and a
**React** admin dashboard.

## Structure

```
xb2bx-ai-chatbot/
├── server/     Node + Express backend — OpenAI (token streaming) + Supabase,
│               5 specialist agents, tools, leads/conversations, admin API.
│               Run schema.sql in Supabase. See server/README.md
├── client/     React chat widget (cream/olive theme), streams replies live.
│               See client/README.md
└── admin/      React admin panel — control the bot, knowledge (training),
                OpenAI key, leads, conversations, suppliers, products, etc.
                See admin/README.md
```

## Quick start

1. **Database** — create a Supabase project, open the SQL editor, and run
   [`server/schema.sql`](server/schema.sql).
2. **Backend**
   ```bash
   cd server
   npm install
   cp .env.example .env     # set OPENAI_API_KEY, SUPABASE_URL,
                            # SUPABASE_SERVICE_ROLE_KEY, ADMIN_TOKEN
   npm start                # http://localhost:8787  (seeds settings + knowledge)
   ```
3. **Chat widget**
   ```bash
   cd client && npm install && npm run dev     # http://localhost:5173
   ```
4. **Admin panel**
   ```bash
   cd admin && npm install && npm run dev      # http://localhost:5174
   ```
   Log in with your `ADMIN_TOKEN`.

## Highlights

- **Token-by-token streaming** — replies appear live in the widget (SSE).
- **Admin-controlled** — OpenAI key, models, persona, contact info, and the
  knowledge base ("training") are all editable from the admin panel, stored in
  Supabase; changes apply within seconds without a redeploy.
- **Tools wired to the database** — supplier/product search, RFQs, listings,
  leads, support tickets, and human handoff all persist to Supabase.
- **One theme** across the widget and admin (cream · olive · serif).
