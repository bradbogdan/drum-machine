-- Auto-updates the updated_at column on every row update, so we don't have to set it from app code.

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger patterns_set_updated_at
  before update on public.patterns
  for each row execute function public.set_updated_at();
