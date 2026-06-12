-- Money Quiz backend schema: profiles, per-user data slices, Plaid items,
-- activity events, and support tickets. Every table has row-level security;
-- per-user isolation is enforced here, not in app code.

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, created automatically on signup.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

-- The app owner's account is the seed admin. Placeholder personal address
-- until a dedicated app email exists; promote others via SQL editor.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    coalesce(new.email, ''),
    case when new.email = 'davidoloyede00@gmail.com' then 'admin' else 'user' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin check used by policies. SECURITY DEFINER so the lookup itself isn't
-- blocked by the profiles RLS (avoids policy recursion).
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Users may edit their profile but never their own role.
create function public.prevent_role_change()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'role change not allowed';
  end if;
  return new;
end;
$$;

create trigger profiles_role_guard
  before update on public.profiles
  for each row execute function public.prevent_role_change();

alter table public.profiles enable row level security;

create policy "read own profile or admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

create policy "update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- user_slices: cloud mirror of the app's localStorage slices, one row per
-- (user, storage key). Values are opaque JSONB; the app reads/writes whole
-- slices. Deliberately NO admin read policy — admins never see user data.
-- ---------------------------------------------------------------------------
create table public.user_slices (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  value jsonb not null,
  rev bigint not null default 1,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create function public.touch_user_slice()
returns trigger
language plpgsql
as $$
begin
  new.rev := old.rev + 1;
  new.updated_at := now();
  return new;
end;
$$;

create trigger user_slices_touch
  before update on public.user_slices
  for each row execute function public.touch_user_slice();

alter table public.user_slices enable row level security;

create policy "own slices" on public.user_slices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- plaid_items: bank connections. Access tokens are AES-256-GCM encrypted by
-- the Edge Function before insert. RLS is enabled with ZERO client policies:
-- only the Edge Function (service role) can touch this table, and it must
-- filter by user_id in code.
-- ---------------------------------------------------------------------------
create table public.plaid_items (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  institution text not null default 'Bank',
  account_type text not null default 'bank' check (account_type in ('bank', 'credit')),
  access_token_enc text,
  is_mock boolean not null default false,
  cursor text,
  transactions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index plaid_items_user on public.plaid_items (user_id);

alter table public.plaid_items enable row level security;

-- ---------------------------------------------------------------------------
-- activity_events: product analytics + domain events, batched from clients.
-- Privacy rule (enforced in the client tracker): props never include
-- transaction descriptions or amounts.
-- ---------------------------------------------------------------------------
create table public.activity_events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id text not null,
  name text not null,
  props jsonb not null default '{}'::jsonb,
  client_ts timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index events_created on public.activity_events (created_at desc);
create index events_user on public.activity_events (user_id, created_at desc);

alter table public.activity_events enable row level security;

create policy "insert own events" on public.activity_events
  for insert with check (auth.uid() = user_id);

create policy "admin reads events" on public.activity_events
  for select using (public.is_admin());

-- ---------------------------------------------------------------------------
-- support tickets + message threads.
-- ---------------------------------------------------------------------------
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject text not null,
  body text not null,
  category text,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tickets_status on public.support_tickets (status, created_at desc);
create index tickets_user on public.support_tickets (user_id, created_at desc);

alter table public.support_tickets enable row level security;

create policy "user creates ticket" on public.support_tickets
  for insert with check (auth.uid() = user_id);

create policy "read own ticket or admin" on public.support_tickets
  for select using (auth.uid() = user_id or public.is_admin());

create policy "admin updates tickets" on public.support_tickets
  for update using (public.is_admin());

create table public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users (id),
  body text not null,
  created_at timestamptz not null default now()
);

create index ticket_messages_ticket on public.ticket_messages (ticket_id, created_at);

alter table public.ticket_messages enable row level security;

create policy "participants read thread" on public.ticket_messages
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id and t.user_id = auth.uid()
    )
  );

create policy "participants post" on public.ticket_messages
  for insert with check (
    author_id = auth.uid()
    and (
      public.is_admin()
      or exists (
        select 1 from public.support_tickets t
        where t.id = ticket_id and t.user_id = auth.uid()
      )
    )
  );

-- A reply bumps the parent ticket so the admin queue sorts by freshness.
create function public.touch_ticket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.support_tickets set updated_at = now() where id = new.ticket_id;
  return new;
end;
$$;

create trigger ticket_messages_touch
  after insert on public.ticket_messages
  for each row execute function public.touch_ticket();

-- ---------------------------------------------------------------------------
-- admin_metrics: one RPC for the admin dashboard numbers. Checks the caller's
-- role itself, so it's safe to expose through PostgREST.
-- ---------------------------------------------------------------------------
create function public.admin_metrics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  return jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'dau', (select count(distinct user_id) from public.activity_events
            where created_at > now() - interval '1 day'),
    'wau', (select count(distinct user_id) from public.activity_events
            where created_at > now() - interval '7 days'),
    'open_tickets', (select count(*) from public.support_tickets
                     where status in ('open', 'in_progress')),
    'events_24h', (select count(*) from public.activity_events
                   where created_at > now() - interval '1 day')
  );
end;
$$;
