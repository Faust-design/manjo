-- manjo: Rechnungen (Ausgaben) nachträglich einrichten.
-- Im Supabase SQL-Editor ausführen. Voraussetzung: schema.sql ist bereits gelaufen.

create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  list_id      uuid not null references public.lists(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  description  text not null default '' check (char_length(description) <= 120),
  payer_email  text not null check (payer_email = lower(payer_email)),
  participants text[] not null default '{}',
  created_at   timestamptz not null default now()
);
create index if not exists expenses_list_idx on public.expenses(list_id);

alter table public.expenses enable row level security;

drop policy if exists expenses_all on public.expenses;
create policy expenses_all on public.expenses for all to authenticated
  using (public.can_access_list(list_id))
  with check (public.can_access_list(list_id));

revoke all on public.expenses from anon;
grant select, insert, update, delete on public.expenses to authenticated;

alter publication supabase_realtime add table public.expenses;
