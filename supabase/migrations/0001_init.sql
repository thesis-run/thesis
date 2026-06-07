-- Thesis — initial schema.
-- Workspace → Portal → Section → Doc, with snapshots, access keys, and domains.
-- RLS scopes everything by workspace membership. (Applied once a Supabase project is provisioned.)

create extension if not exists "pgcrypto";

-- Short, prefixed, paste-able keys: prt_xxxxx / doc_xxxxx
create or replace function thesis_key(prefix text) returns text language sql as $$
  select prefix || '_' || substr(replace(encode(gen_random_bytes(8), 'base64'), '/', ''), 1, 8);
$$;

create table if not exists workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'owner' check (role in ('owner','editor','viewer')),
  primary key (workspace_id, user_id)
);

create table if not exists portals (
  id            uuid primary key default gen_random_uuid(),
  key           text not null unique default thesis_key('prt'),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  name          text not null,
  slug          text not null,
  access_policy text not null default 'public' check (access_policy in ('public','gated')),
  created_at    timestamptz not null default now(),
  unique (workspace_id, slug)
);

create table if not exists sections (
  id         uuid primary key default gen_random_uuid(),
  portal_id  uuid not null references portals(id) on delete cascade,
  name       text not null,
  position   int not null default 0
);

create table if not exists docs (
  id           uuid primary key default gen_random_uuid(),
  key          text not null unique default thesis_key('doc'),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  portal_id    uuid not null references portals(id) on delete cascade,
  section_id   uuid references sections(id) on delete set null,
  title        text not null,
  slug         text not null,
  draft_md     text not null default '',
  -- source provenance: { type: gist|github|upload|inline, ref, last_synced }
  source       jsonb not null default '{"type":"inline"}'::jsonb,
  position     int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (portal_id, slug)
);

-- Frozen published render, served live (independent of repo uptime).
create table if not exists doc_snapshots (
  id           uuid primary key default gen_random_uuid(),
  doc_id       uuid not null references docs(id) on delete cascade,
  portal_id    uuid not null references portals(id) on delete cascade,
  md           text not null,
  published_at timestamptz not null default now(),
  published_by uuid references auth.users(id)
);

create table if not exists domains (
  id          uuid primary key default gen_random_uuid(),
  portal_id   uuid not null references portals(id) on delete cascade,
  hostname    text not null unique,
  base_path   text not null default '/',
  tls_status  text not null default 'pending',
  created_at  timestamptz not null default now()
);

create table if not exists access_keys (
  id           uuid primary key default gen_random_uuid(),
  key          text not null unique,
  portal_id    uuid not null references portals(id) on delete cascade,
  label        text,
  status       text not null default 'active' check (status in ('active','revoked')),
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);

create table if not exists access_logs (
  id            uuid primary key default gen_random_uuid(),
  access_key_id uuid references access_keys(id) on delete set null,
  portal_id     uuid not null references portals(id) on delete cascade,
  ts            timestamptz not null default now(),
  ip            text,
  user_agent    text
);

-- Row Level Security: members see only their workspaces' rows.
alter table workspaces enable row level security;
alter table members enable row level security;
alter table portals enable row level security;
alter table sections enable row level security;
alter table docs enable row level security;
alter table doc_snapshots enable row level security;
alter table domains enable row level security;
alter table access_keys enable row level security;
alter table access_logs enable row level security;

create or replace function is_member(ws uuid) returns boolean language sql security definer stable as $$
  select exists (select 1 from members m where m.workspace_id = ws and m.user_id = auth.uid());
$$;

create policy ws_member on workspaces for all using (is_member(id)) with check (owner_id = auth.uid());
create policy mem_self on members for all using (user_id = auth.uid() or is_member(workspace_id));
create policy portal_member on portals for all using (is_member(workspace_id)) with check (is_member(workspace_id));
create policy doc_member on docs for all using (is_member(workspace_id)) with check (is_member(workspace_id));
create policy section_member on sections for all using (is_member((select workspace_id from portals p where p.id = portal_id)));
create policy snap_member on doc_snapshots for all using (is_member((select workspace_id from portals p where p.id = portal_id)));
create policy domain_member on domains for all using (is_member((select workspace_id from portals p where p.id = portal_id)));
create policy key_member on access_keys for all using (is_member((select workspace_id from portals p where p.id = portal_id)));
create policy log_member on access_logs for all using (is_member((select workspace_id from portals p where p.id = portal_id)));
