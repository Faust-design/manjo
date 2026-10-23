-- manjo Update 7: Artikel mehreren Märkten zuordnen (enthält Update 6)
-- Einmal im Supabase SQL Editor ausführen. Mehrfaches Ausführen schadet nicht.
alter table public.items add column if not exists target_list uuid references public.lists(id) on delete set null;
alter table public.items add column if not exists targets uuid[] not null default '{}';
update public.items set targets = array[target_list] where target_list is not null and targets = '{}';
notify pgrst, 'reload schema';
