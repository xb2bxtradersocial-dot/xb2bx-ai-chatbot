# XB2BX Assistant — Admin Panel (React)

A full admin dashboard for the XB2BX AI Assistant, built with **React + Vite**,
in the same cream/olive theme as the chat widget. It controls everything the bot
does through the backend admin API.

## Features

- **Dashboard** — live counts (conversations, leads, RFQs, tickets, suppliers…)
- **Conversations** — browse full chat history; open any chat; delete
- **Leads** — view scored leads, change status, delete
- **Suppliers** — full CRUD on the directory the assistant searches
- **Products** — full CRUD on the catalogue
- **RFQs** — manage requests for quote and their status
- **Tickets & Handoffs** — support tickets + human-handoff escalations
- **Training** — edit the knowledge base sections the bot answers from (enable/
  disable/edit/add) — changes apply within seconds
- **Settings** — turn the bot on/off, set the **OpenAI API key**, models,
  temperature, persona/extra instructions, company name, and contact info

## Run locally

```bash
npm install
cp .env.example .env     # point VITE_API_BASE at your backend /api
npm run dev              # http://localhost:5174
```

Log in with the backend's `ADMIN_TOKEN`. Make sure the backend is running and its
`.env` has `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `ADMIN_TOKEN`.

## Build for production

```bash
npm run build            # outputs to dist/
```

Deploy `dist/` to any static host. For client-side routing, add an SPA fallback
(rewrite all routes to `/index.html`) — e.g. on Vercel a catch-all rewrite.
Set `VITE_API_BASE` to your deployed backend `/api` URL.

## Structure

```
admin/src/
  App.jsx                Router + auth gate
  api.js / auth.js       Authenticated API client + token storage
  config.js              VITE_API_BASE
  components/            Layout (sidebar), ui.jsx (Modal, StatCard, Badge…)
  pages/                 Login, Dashboard, Conversations, Leads, Suppliers,
                         Products, Rfqs, Tickets, Training, Settings
  styles.css             Dashboard theme
```
