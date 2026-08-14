-- ============================================================
-- XB2BX Assistant — Supabase / Postgres schema
-- Run this once in the Supabase SQL editor (or psql) to create the database.
-- Settings and knowledge (training) rows are auto-seeded by the server on first
-- boot from code defaults, so you only need to run the table definitions here.
-- No sample/dummy rows are inserted — add real suppliers/products from the
-- admin panel (Suppliers / Products pages).
-- ============================================================

-- ---------- Supplier directory ----------
create table if not exists suppliers (
  id               text primary key,
  name             text not null,
  country          text not null default '',
  categories       text not null default '',
  keywords         text not null default '',
  description      text not null default '',
  monthly_capacity integer not null default 0,
  min_order_qty    integer not null default 0,
  verified         integer not null default 0,
  responsiveness   numeric not null default 0,
  rating           numeric not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists idx_suppliers_country  on suppliers(country);
create index if not exists idx_suppliers_verified on suppliers(verified);

-- ---------- Product catalogue ----------
create table if not exists products (
  id          text primary key,
  title       text not null,
  category    text not null default '',
  description text not null default '',
  keywords    text not null default '',
  moq         integer not null default 0,
  price       text not null default '',
  supplier_id text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_products_category on products(category);

-- ---------- Leads ----------
create table if not exists leads (
  id         text primary key,
  name       text not null default '',
  email      text not null default '',
  interest   text not null default '',
  volume     text not null default '',
  budget     text not null default '',
  location   text not null default '',
  timeline   text not null default '',
  score      integer not null default 0,
  tier       text not null default 'cold',
  qualified  integer not null default 0,
  status     text not null default 'new',
  created_at timestamptz not null default now()
);
create index if not exists idx_leads_tier   on leads(tier);
create index if not exists idx_leads_status on leads(status);

-- ---------- Conversations + messages ----------
create table if not exists conversations (
  id            text primary key,
  session_id    text not null default '',
  channel       text not null default 'web',
  agent         text not null default '',
  status        text not null default 'open',
  message_count integer not null default 0,
  last_message  text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_conversations_session on conversations(session_id);
create index if not exists idx_conversations_updated on conversations(updated_at desc);

create table if not exists messages (
  id              bigint generated always as identity primary key,
  conversation_id text not null,
  role            text not null,
  agent           text not null default '',
  content         text not null default '',
  created_at      timestamptz not null default now()
);
create index if not exists idx_messages_conversation on messages(conversation_id);

-- ---------- RFQs ----------
create table if not exists rfqs (
  id                text primary key,
  product           text not null default '',
  quantity          integer not null default 0,
  target_country    text not null default '',
  delivery_timeline text not null default '',
  contact_email     text not null default '',
  notes             text not null default '',
  status            text not null default 'created',
  created_at        timestamptz not null default now()
);

-- ---------- Seller listings ----------
create table if not exists listings (
  id           text primary key,
  title        text not null default '',
  category     text not null default '',
  description  text not null default '',
  price        text not null default '',
  seller_email text not null default '',
  status       text not null default 'draft',
  created_at   timestamptz not null default now()
);

-- ---------- Support tickets ----------
create table if not exists support_tickets (
  id            text primary key,
  subject       text not null default '',
  description   text not null default '',
  contact_email text not null default '',
  priority      text not null default 'normal',
  status        text not null default 'open',
  created_at    timestamptz not null default now()
);

-- ---------- Escalations ----------
create table if not exists escalations (
  id            text primary key,
  reason        text not null default '',
  contact_email text not null default '',
  contact_phone text not null default '',
  status        text not null default 'queued',
  created_at    timestamptz not null default now()
);

-- ---------- Settings (admin-controlled chatbot config) ----------
create table if not exists settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

-- ---------- Knowledge / training ----------
create table if not exists knowledge (
  key        text primary key,
  title      text not null default '',
  content    text not null default '',
  enabled    boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Admin panel staff logins are stored inside the `settings` table (key
-- "admin_accounts") as JSON, so no extra table is required. The owner account
-- is auto-seeded from ADMIN_EMAIL / ADMIN_PASSWORD on first boot.

-- No sample/dummy data. Add real suppliers and products from the admin panel.
