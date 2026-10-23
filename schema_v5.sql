-- manjo Update 5: Glossar (Begriff -> genaues Produkt und Markt)
-- Einmal im Supabase SQL Editor ausführen. Mehrfaches Ausführen schadet nicht.
create table if not exists public.products (
  id         uuid primary key default gen_random_uuid(),
  list_id    uuid not null references public.lists(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 60),
  product    text not null default '' check (char_length(product) <= 120),
  terms      text not null default '' check (char_length(terms) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists products_list_idx on public.products(list_id);
alter table public.products enable row level security;
drop policy if exists products_all on public.products;
create policy products_all on public.products for all to authenticated
  using (public.can_access_list(list_id)) with check (public.can_access_list(list_id));
revoke all on public.products from anon;
grant select, insert, update, delete on public.products to authenticated;
do $$ begin
  alter publication supabase_realtime add table public.products;
exception when duplicate_object then null; end $$;
notify pgrst, 'reload schema';
