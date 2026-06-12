-- ============================================================
-- Expense Tracker — Supabase setup
-- Run this ONCE in the Supabase SQL editor of the NEW project.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.
-- ============================================================

-- ── Tables ──────────────────────────────────────────────────

create table if not exists public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text not null unique default upper(substr(md5(random()::text), 1, 6)),
  created_at  timestamptz not null default now()
);

create table if not exists public.household_members (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  role         text not null default 'member' check (role in ('owner', 'member')),
  created_at   timestamptz not null default now(),
  unique (household_id, user_id)
);

create table if not exists public.accounts (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households(id) on delete cascade,
  name            text not null,
  type            text not null default 'bank' check (type in ('cash', 'bank', 'card', 'wallet', 'other')),
  opening_balance numeric(14,2) not null default 0,
  is_archived     boolean not null default false,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);

create table if not exists public.categories (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name         text not null,
  kind         text not null check (kind in ('expense', 'income')),
  color        text,
  is_archived  boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (household_id, name, kind)
);

create table if not exists public.recurring_rules (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  type         text not null check (type in ('expense', 'income')),
  amount       numeric(14,2) not null check (amount > 0),
  account_id   uuid not null references public.accounts(id) on delete cascade,
  category_id  uuid references public.categories(id) on delete set null,
  note         text,
  frequency    text not null check (frequency in ('daily', 'weekly', 'monthly', 'yearly')),
  every_n      int not null default 1 check (every_n >= 1),
  start_date   date not null default current_date,
  end_date     date,
  next_run     date not null,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists public.transactions (
  id                  uuid primary key default gen_random_uuid(),
  household_id        uuid not null references public.households(id) on delete cascade,
  type                text not null check (type in ('expense', 'income', 'transfer')),
  amount              numeric(14,2) not null check (amount > 0),
  account_id          uuid not null references public.accounts(id) on delete cascade,
  transfer_account_id uuid references public.accounts(id) on delete cascade,
  category_id         uuid references public.categories(id) on delete set null,
  txn_date            date not null default current_date,
  note                text,
  created_by          uuid not null default auth.uid() references auth.users(id),
  recurring_id        uuid references public.recurring_rules(id) on delete set null,
  created_at          timestamptz not null default now(),
  check (
    (type = 'transfer' and transfer_account_id is not null and category_id is null)
    or
    (type <> 'transfer' and transfer_account_id is null)
  ),
  check (transfer_account_id is null or transfer_account_id <> account_id)
);

create index if not exists idx_txn_household_date on public.transactions (household_id, txn_date desc);
create index if not exists idx_txn_category on public.transactions (category_id);
create index if not exists idx_recurring_due on public.recurring_rules (household_id, next_run) where is_active;

-- ── RLS helper: which households am I in? ───────────────────
-- security definer so policies can call it without recursing.

create or replace function public.my_household_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select household_id from public.household_members where user_id = auth.uid()
$$;

-- ── Row-Level Security ───────────────────────────────────────

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.recurring_rules enable row level security;

-- households: members can read; inserts happen via create_household()
drop policy if exists households_select on public.households;
create policy households_select on public.households
  for select using (id in (select public.my_household_ids()));

-- household_members: members can read their household's roster,
-- and edit their own display_name
drop policy if exists members_select on public.household_members;
create policy members_select on public.household_members
  for select using (household_id in (select public.my_household_ids()));
drop policy if exists members_update_self on public.household_members;
create policy members_update_self on public.household_members
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- accounts / categories / transactions / recurring_rules:
-- full access for household members
drop policy if exists accounts_all on public.accounts;
create policy accounts_all on public.accounts
  for all using (household_id in (select public.my_household_ids()))
  with check (household_id in (select public.my_household_ids()));

drop policy if exists categories_all on public.categories;
create policy categories_all on public.categories
  for all using (household_id in (select public.my_household_ids()))
  with check (household_id in (select public.my_household_ids()));

drop policy if exists transactions_all on public.transactions;
create policy transactions_all on public.transactions
  for all using (household_id in (select public.my_household_ids()))
  with check (
    household_id in (select public.my_household_ids())
    and created_by = auth.uid()
  );

drop policy if exists recurring_all on public.recurring_rules;
create policy recurring_all on public.recurring_rules
  for all using (household_id in (select public.my_household_ids()))
  with check (household_id in (select public.my_household_ids()));

-- ── Computed balances (RLS of the caller applies) ───────────

create or replace view public.account_balances
with (security_invoker = on) as
select
  a.id as account_id,
  a.household_id,
  a.name,
  a.type,
  a.is_archived,
  a.sort_order,
  a.opening_balance,
  a.opening_balance + coalesce(sum(
    case
      when t.type = 'income'   and t.account_id = a.id          then  t.amount
      when t.type = 'expense'  and t.account_id = a.id          then -t.amount
      when t.type = 'transfer' and t.account_id = a.id          then -t.amount
      when t.type = 'transfer' and t.transfer_account_id = a.id then  t.amount
      else 0
    end
  ), 0) as balance
from public.accounts a
left join public.transactions t
  on t.account_id = a.id or t.transfer_account_id = a.id
group by a.id;

-- ── RPC: create a household (seeds categories + accounts) ───

create or replace function public.create_household(p_name text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if exists (select 1 from household_members where user_id = auth.uid()) then
    raise exception 'You are already in a household';
  end if;

  insert into households (name) values (trim(p_name)) returning id into hid;
  insert into household_members (household_id, user_id, display_name, role)
  values (hid, auth.uid(), trim(p_display_name), 'owner');

  insert into categories (household_id, name, kind, color) values
    (hid, 'Groceries',     'expense', '#34d399'),
    (hid, 'Rent',          'expense', '#818cf8'),
    (hid, 'Utilities',     'expense', '#fbbf24'),
    (hid, 'Transport',     'expense', '#60a5fa'),
    (hid, 'Dining Out',    'expense', '#f472b6'),
    (hid, 'Shopping',      'expense', '#a78bfa'),
    (hid, 'Health',        'expense', '#f87171'),
    (hid, 'Entertainment', 'expense', '#22d3ee'),
    (hid, 'Education',     'expense', '#4ade80'),
    (hid, 'Other',         'expense', '#94a3b8'),
    (hid, 'Salary',        'income',  '#39ff7a'),
    (hid, 'Business',      'income',  '#2dd4bf'),
    (hid, 'Interest',      'income',  '#facc15'),
    (hid, 'Gift',          'income',  '#e879f9'),
    (hid, 'Other Income',  'income',  '#94a3b8');

  insert into accounts (household_id, name, type, opening_balance, sort_order) values
    (hid, 'Cash', 'cash', 0, 1),
    (hid, 'Bank', 'bank', 0, 2);

  return hid;
end $$;

-- ── RPC: join an existing household with the invite code ────

create or replace function public.join_household(p_code text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if exists (select 1 from household_members where user_id = auth.uid()) then
    raise exception 'You are already in a household';
  end if;

  select id into hid from households where invite_code = upper(trim(p_code));
  if hid is null then
    raise exception 'Invalid invite code';
  end if;

  insert into household_members (household_id, user_id, display_name, role)
  values (hid, auth.uid(), trim(p_display_name), 'member');

  return hid;
end $$;

-- ── RPC: log a due recurring rule as a real transaction ─────
-- Runs as the caller, so RLS applies (must be a household member).

create or replace function public.log_recurring(p_rule_id uuid)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  r record;
  tid uuid;
begin
  select * into r from recurring_rules where id = p_rule_id for update;
  if not found then
    raise exception 'Rule not found';
  end if;
  if not r.is_active then
    raise exception 'Rule is paused';
  end if;

  insert into transactions (household_id, type, amount, account_id, category_id, txn_date, note, recurring_id)
  values (r.household_id, r.type, r.amount, r.account_id, r.category_id, r.next_run, r.note, r.id)
  returning id into tid;

  update recurring_rules
  set next_run = (
    case r.frequency
      when 'daily'   then r.next_run + make_interval(days   => r.every_n)
      when 'weekly'  then r.next_run + make_interval(weeks  => r.every_n)
      when 'monthly' then r.next_run + make_interval(months => r.every_n)
      when 'yearly'  then r.next_run + make_interval(years  => r.every_n)
    end
  )::date
  where id = r.id;

  return tid;
end $$;

-- ── Grants ───────────────────────────────────────────────────

grant execute on function public.create_household(text, text) to authenticated;
grant execute on function public.join_household(text, text) to authenticated;
grant execute on function public.log_recurring(uuid) to authenticated;
grant execute on function public.my_household_ids() to authenticated;
