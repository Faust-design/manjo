-- manjo Update 6: allgemeine Liste mit Zuordnung zu einem Markt
-- Einmal im Supabase SQL Editor ausführen. Mehrfaches Ausführen schadet nicht.
alter table public.items add column if not exists target_list uuid references public.lists(id) on delete set null;
create index if not exists items_target_idx on public.items(target_list);
notify pgrst, 'reload schema';
