create table if not exists public.capataz_runtime_snapshots (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.capataz_runtime_snapshots enable row level security;

drop policy if exists "service role can manage runtime snapshots" on public.capataz_runtime_snapshots;

create policy "service role can manage runtime snapshots"
on public.capataz_runtime_snapshots
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
