-- Einkaufsroute: Datenbank-Schema für Supabase
-- Einmal im Supabase Dashboard unter "SQL Editor" ausführen.

create table if not exists public.lists (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 40),
  tpl         text not null default 'eigen',
  stations    jsonb not null default '[]'::jsonb,
  learned     jsonb not null default '{}'::jsonb,
  owner       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  owner_email text not null default lower(coalesce(auth.jwt() ->> 'email', '')),
  created_at  timestamptz not null default now()
);

create table if not exists public.list_members (
  list_id    uuid not null references public.lists(id) on delete cascade,
  email      text not null check (email = lower(email)),
  created_at timestamptz not null default now(),
  primary key (list_id, email)
);

create table if not exists public.items (
  id         uuid primary key default gen_random_uuid(),
  list_id    uuid not null references public.lists(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 120),
  cat        text not null default 'sonst',
  done       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists items_list_idx on public.items(list_id);

-- Zugriffsprüfung. security definer, damit die Regeln sich nicht gegenseitig aufrufen (Rekursion).
create or replace function public.is_list_owner(lid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.lists l where l.id = lid and l.owner = auth.uid());
$$;

create or replace function public.can_access_list(lid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_list_owner(lid)
      or exists (
        select 1 from public.list_members m
        where m.list_id = lid
          and m.email = lower(coalesce(auth.jwt() ->> 'email', ''))
      );
$$;

-- Der Ersteller einer Liste lässt sich nachträglich nicht ändern.
create or replace function public.lists_keep_owner() returns trigger
language plpgsql as $$
begin
  new.owner := old.owner;
  new.owner_email := old.owner_email;
  return new;
end $$;
drop trigger if exists lists_keep_owner on public.lists;
create trigger lists_keep_owner before update on public.lists
  for each row execute function public.lists_keep_owner();

alter table public.lists        enable row level security;
alter table public.list_members enable row level security;
alter table public.items        enable row level security;

-- Listen (die owner-Prüfung im select-Recht ist nötig, damit 'insert ... returning' direkt klappt): sehen und bearbeiten dürfen Ersteller und Eingeladene, anlegen und löschen nur der Ersteller.
drop policy if exists lists_select on public.lists;
drop policy if exists lists_insert on public.lists;
drop policy if exists lists_update on public.lists;
drop policy if exists lists_delete on public.lists;
create policy lists_select on public.lists for select to authenticated using (owner = auth.uid() or public.can_access_list(id));
create policy lists_insert on public.lists for insert to authenticated with check (owner = auth.uid());
create policy lists_update on public.lists for update to authenticated using (public.can_access_list(id)) with check (public.can_access_list(id));
create policy lists_delete on public.lists for delete to authenticated using (owner = auth.uid());

-- Personen: einladen und entfernen nur der Ersteller, austreten darf jede Person selbst.
drop policy if exists members_select on public.list_members;
drop policy if exists members_insert on public.list_members;
drop policy if exists members_delete on public.list_members;
create policy members_select on public.list_members for select to authenticated using (public.can_access_list(list_id));
create policy members_insert on public.list_members for insert to authenticated with check (public.is_list_owner(list_id));
create policy members_delete on public.list_members for delete to authenticated
  using (public.is_list_owner(list_id) or email = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Artikel: alle mit Zugriff auf die Liste.
drop policy if exists items_all on public.items;
create policy items_all on public.items for all to authenticated
  using (public.can_access_list(list_id)) with check (public.can_access_list(list_id));

revoke all on public.lists, public.list_members, public.items from anon;
grant select, insert, update, delete on public.lists, public.list_members, public.items to authenticated;
grant execute on function public.is_list_owner(uuid), public.can_access_list(uuid) to authenticated;

-- Live-Synchronisierung
alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.lists;
alter publication supabase_realtime add table public.list_members;
