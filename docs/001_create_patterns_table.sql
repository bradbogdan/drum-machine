-- Stores user-saved drum patterns.
-- Each row belongs to one auth.users row. Deleting a user cascades to their patterns.

create table public.patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  bpm int not null check (bpm between 60 and 200),
  grid jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index patterns_user_id_idx on public.patterns(user_id);
