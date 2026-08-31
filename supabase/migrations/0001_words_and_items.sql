-- Wordwise — Supabase schema (its own project; unrelated to pbcindex).
-- Run in: Supabase Dashboard → SQL Editor → paste → Run.
-- Mirrors the Word type in src/vocab.ts.

-- ---------------------------------------------------------------- words
create table if not exists words (
  id              text primary key,                    -- stable slug, e.g. 'mitigate'
  word            text not null,
  pronunciation   text not null,
  part_of_speech  text not null,
  definition      text not null,                       -- the familiar sense
  example         text not null,                       -- must contain the word; drives the cloze form
  alt_definition  text,                                -- the tested second sense, when it has one
  alt_example     text,                                -- must contain the word in that second sense
  synonyms        text[] not null default '{}',
  antonyms        text[] not null default '{}',
  difficulty      text not null check (difficulty in ('Easy','Medium','Hard')),
  priority        int  not null check (priority between 0 and 100),
  category        text not null,
  tier            smallint check (tier between 1 and 3),   -- from data/word-inventory.json
  groups          text[] not null default '{}',            -- core-academic, stance-tone, multi-meaning...
  source          text,                                    -- provenance, e.g. 'AWL-S2'
  active          boolean not null default true,           -- retire a word without deleting it
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- a second sense is only usable if both halves are present
  constraint words_alt_sense_complete
    check ((alt_definition is null) = (alt_example is null))
);

-- Postgres forbids subqueries inside CHECK, so distinctness needs a function.
create or replace function has_duplicates(a text[]) returns boolean
language sql immutable as $$
  select cardinality(a) <> (select count(distinct x) from unnest(a) x);
$$;

-- ---------------------------------------------------------------- items
-- One word has many authored questions. The app also generates further forms
-- at runtime from the word's own fields; only authored items live here.
create table if not exists items (
  id           uuid primary key default gen_random_uuid(),
  word_id      text not null references words(id) on delete cascade,
  form         text not null check (form in
                 ('context','cloze','wordToDef','defToWord','synonym','senseShift')),
  prompt       text not null,
  choices      text[] not null,
  answer       text not null,
  explanation  text not null,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  -- the defect that bit us while authoring by hand: an item whose answer is not
  -- among its own choices is unanswerable. Reject it at write time.
  constraint items_answer_is_a_choice check (answer = any (choices)),
  constraint items_enough_choices     check (array_length(choices, 1) >= 3),
  constraint items_choices_distinct check (not has_duplicates(choices))
);
-- NOTE: deliberately no constraint that answer = the headword. Contrast items
-- ("subtle rather than _____" → obvious) and inflected answers ("subjected",
-- "reservations") are legitimate and would fail such a rule.

-- ---------------------------------------------------------------- indexes
create index if not exists words_priority_idx   on words (priority desc);
create index if not exists words_tier_idx       on words (tier);
create index if not exists words_active_idx     on words (active);
create index if not exists words_groups_idx     on words using gin (groups);
create index if not exists items_word_idx       on items (word_id);
create index if not exists items_active_idx     on items (active);

-- ---------------------------------------------------------------- updated_at
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists words_set_updated_at on words;
create trigger words_set_updated_at before update on words
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------- RLS
-- The word list is public reference content: readable by anyone, writable only
-- server-side with the service_role key, which bypasses RLS.
alter table words enable row level security;
alter table items enable row level security;

drop policy if exists words_public_read on words;
create policy words_public_read on words
  for select using (active);

drop policy if exists items_public_read on items;
create policy items_public_read on items
  for select using (active);

-- Progress sync, if it is ever added, belongs in its own tables keyed by
-- auth.uid() with their own policies. Nothing above needs to change for it.
