-- Row Level Security: without this, anyone with the publishable key could read/write any row.
-- After enabling RLS, all access is denied by default until policies are created (next file).

alter table public.patterns enable row level security;
