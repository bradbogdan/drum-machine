-- Four policies, one per operation.
-- auth.uid() returns the logged-in user's id. Each policy says: only touch rows where user_id matches you.

create policy "users read own patterns"
  on public.patterns for select
  using (auth.uid() = user_id);

create policy "users insert own patterns"
  on public.patterns for insert
  with check (auth.uid() = user_id);

create policy "users update own patterns"
  on public.patterns for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete own patterns"
  on public.patterns for delete
  using (auth.uid() = user_id);
