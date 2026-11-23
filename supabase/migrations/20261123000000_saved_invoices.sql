-- FortyFive: saved invoice lists for signed-in founders (optional; Quick Check needs no account).
-- Run once in the Supabase dashboard: SQL Editor > New query > paste this file > Run.
--
-- What is stored: only the invoice details the founder confirmed for the tools pages (client,
-- number, amount, dates, agreed days, a promised date, paid). Never the invoice file, the AI's
-- reading of it, client replies or email drafts. Each row belongs to one auth user, and row-level
-- security means a user can only ever see or change their own rows.

create table if not exists public.invoices (
  id uuid primary key,                                   -- generated in the browser (crypto.randomUUID)
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client text not null check (char_length(client) between 1 and 200),
  number text not null check (char_length(number) between 1 and 100),
  amount numeric(14, 2) not null check (amount > 0 and amount <= 10000000000),
  invoice_date date not null,
  acceptance_date date not null,
  agreement_days integer check (agreement_days between 0 and 365),  -- null = no written agreement
  promised_date date,
  paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoices_user_id_idx on public.invoices (user_id);

alter table public.invoices enable row level security;

drop policy if exists "own invoices: read" on public.invoices;
drop policy if exists "own invoices: add" on public.invoices;
drop policy if exists "own invoices: change" on public.invoices;
drop policy if exists "own invoices: delete" on public.invoices;
create policy "own invoices: read" on public.invoices for select to authenticated using (user_id = auth.uid());
create policy "own invoices: add" on public.invoices for insert to authenticated with check (user_id = auth.uid());
create policy "own invoices: change" on public.invoices for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own invoices: delete" on public.invoices for delete to authenticated using (user_id = auth.uid());

-- Signed-out visitors (the anon role) get nothing at all.
revoke all on public.invoices from anon;
grant select, insert, update, delete on public.invoices to authenticated;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists invoices_touch on public.invoices;
create trigger invoices_touch before update on public.invoices
  for each row execute function public.touch_updated_at();

-- "Delete my account and data": removes the caller's auth user; their invoices go with it
-- (on delete cascade). Runs with the owner's rights, but only ever for auth.uid().
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from public.invoices where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
