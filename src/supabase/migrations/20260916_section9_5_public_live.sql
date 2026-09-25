-- Section 9.5: Public Live Tournament Pages
-- Adds an explicit opt-in flag so tournament owners can expose a read-only live page.
alter table public.events
  add column if not exists public_enabled boolean not null default false;

create index if not exists events_public_enabled_idx
  on public.events(public_enabled)
  where public_enabled = true;

alter table public.events enable row level security;

drop policy if exists events_public_live_select on public.events;
create policy events_public_live_select on public.events
  for select
  to anon, authenticated
  using (public_enabled = true);

grant select on public.events to anon;
