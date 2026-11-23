-- FortyFive: messages from the landing page's contact form.
-- Run once in the Supabase dashboard: SQL Editor > New query > paste this file > Run.
--
-- Anyone may ADD a message (that is what a contact form is), but nobody can read, change or
-- delete messages through the API: there are no select/update/delete policies, and those rights
-- are not granted. The owner reads them in the Supabase dashboard (Table Editor), which bypasses
-- row-level security. The website server inserts with the publishable key, so it can't read them
-- back either.

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 254 and email like '%_@_%._%'),
  message text not null check (char_length(message) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

drop policy if exists "anyone can send a message" on public.contact_messages;
create policy "anyone can send a message" on public.contact_messages
  for insert to anon, authenticated
  with check (true);

revoke all on public.contact_messages from anon, authenticated;
grant insert on public.contact_messages to anon, authenticated;
