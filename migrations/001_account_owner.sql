-- ============================================================
-- Migration 001 — per-person account ownership
-- Run ONCE in the Supabase SQL editor (your DB already has the
-- base tables from supabase-setup.sql).
-- Safe to re-run.
-- ============================================================

-- 1. Tag each account with an owner (null = Joint / shared)
alter table public.accounts
  add column if not exists owner_member_id uuid
  references public.household_members(id) on delete set null;

-- 2. Expose owner on the balances view.
--    Drop first: create-or-replace can't insert a column mid-list on an
--    existing view (Postgres error 42P16).
drop view if exists public.account_balances;

create view public.account_balances
with (security_invoker = on) as
select
  a.id as account_id,
  a.household_id,
  a.name,
  a.type,
  a.owner_member_id,
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
