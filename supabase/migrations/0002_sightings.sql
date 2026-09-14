-- Ten Vocab — crowd-sourced "seen on the actual SAT" reports.
-- Run in: Supabase Dashboard → SQL Editor → paste → Run (after 0001).
--
-- Privacy by construction: a report is only (word, date). No user id, no device id,
-- no IP, nothing that identifies who sent it. Readers only ever see aggregates.

create table if not exists sightings (
  id          uuid primary key default gen_random_uuid(),
  word_id     text not null references words(id) on delete cascade,
  seen_on     date not null,
  created_at  timestamptz not null default now(),
  -- the digital SAT launched in the US in March 2024; nothing earlier is a real sighting,
  -- and nothing in the future is either
  constraint sightings_plausible_date check (seen_on >= date '2024-03-01' and seen_on <= current_date)
);
create index if not exists sightings_word_idx on sightings (word_id, seen_on desc);

-- What the app reads: one row per word that has ever been reported.
create or replace view sighting_stats as
  select word_id,
         count(*)::int            as reports,
         max(seen_on)             as last_seen,
         count(distinct seen_on)::int as distinct_dates
  from sightings
  group by word_id;

-- ---------------------------------------------------------------- access
alter table sightings enable row level security;

-- anyone may add a report; nobody may read raw rows, change or delete them
drop policy if exists sightings_public_insert on sightings;
create policy sightings_public_insert on sightings
  for insert to anon, authenticated with check (true);

grant insert on sightings to anon, authenticated;
grant select on sighting_stats to anon, authenticated;
-- (no select/update/delete on the raw table for API roles)

-- The view runs with the definer's privileges so readers get aggregates without
-- having select on the underlying table.
alter view sighting_stats set (security_invoker = false);
