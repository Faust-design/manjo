-- manjo Update 4: Anzeigenamen, Ausgleich im Saldo, keine doppelten Artikel
-- Einmal im Supabase SQL Editor ausführen. Mehrfaches Ausführen schadet nicht.

-- 1) Anzeigenamen
create table if not exists public.profiles (
  id           uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  email        text not null default lower(coalesce(auth.jwt() ->> 'email', '')),
  display_name text not null default '' check (char_length(display_name) <= 40),
  updated_at   timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (true);
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid() and email = lower(coalesce(auth.jwt() ->> 'email', '')));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and email = lower(coalesce(auth.jwt() ->> 'email', '')));
revoke all on public.profiles from anon;
grant select, insert, update on public.profiles to authenticated;

-- 2) Ausgleich: eine Rückzahlung ist eine Ausgabe der Art 'settle'
alter table public.expenses add column if not exists kind text not null default 'expense';
do $$ begin
  alter table public.expenses add constraint expenses_kind_chk check (kind in ('expense', 'settle'));
exception when duplicate_object then null; end $$;

-- 3) Keine doppelten Artikel pro Liste. Vorhandene Dubletten werden zusammengeführt:
--    es bleibt der offene (sonst der älteste) Eintrag.
delete from public.items a using public.items b
 where a.list_id = b.list_id and lower(a.name) = lower(b.name)
   and (a.done::int, a.created_at, a.id) > (b.done::int, b.created_at, b.id);
create unique index if not exists items_list_name_uq on public.items (list_id, lower(name));

-- 4) Live-Updates für Namen
do $$ begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null; end $$;
