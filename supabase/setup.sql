-- MTV Trainer-Cockpit: Speicher für Abrechnung, Kadertool, ToDo
-- Einmal im Supabase-Dashboard unter "SQL Editor" ausführen.

create table if not exists public.user_docs (
  user_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  key        text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.user_docs enable row level security;

-- Jeder Nutzer sieht und ändert ausschließlich seine eigenen Dokumente
drop policy if exists "own docs select" on public.user_docs;
drop policy if exists "own docs insert" on public.user_docs;
drop policy if exists "own docs update" on public.user_docs;
drop policy if exists "own docs delete" on public.user_docs;
create policy "own docs select" on public.user_docs for select to authenticated using (auth.uid() = user_id);
create policy "own docs insert" on public.user_docs for insert to authenticated with check (auth.uid() = user_id);
create policy "own docs update" on public.user_docs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own docs delete" on public.user_docs for delete to authenticated using (auth.uid() = user_id);

grant select, insert, update, delete on public.user_docs to authenticated;
revoke all on public.user_docs from anon;

-- Wach-halten: wird wöchentlich von einer GitHub Action aufgerufen,
-- damit das Free-Projekt nicht nach 7 Tagen Inaktivität pausiert.
create or replace function public.ping() returns timestamptz
language sql stable as $$ select now() $$;
grant execute on function public.ping() to anon, authenticated;
