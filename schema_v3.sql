-- Kassenzettel: Datum des Einkaufs und erkannte Positionen je Ausgabe
alter table public.expenses add column if not exists spent_on date not null default current_date;
alter table public.expenses add column if not exists lines jsonb not null default '[]'::jsonb;
