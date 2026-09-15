-- Section 8: Supabase Auth + event-level access control.
-- Apply this migration after enabling Email/Password Auth in Supabase.
-- Existing events remain usable during migration; populate owner_user_id before
-- enabling the strict policies at the bottom.

alter table public.events
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null;

create index if not exists events_owner_user_id_idx on public.events(owner_user_id);

create table if not exists public.event_members (
  event_id text not null references public.events(event_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'referee' check (role in ('owner','manager','referee')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index if not exists event_members_user_id_idx on public.event_members(user_id);

-- Automatically create an owner membership when an event is created by an authenticated user.
create or replace function public.sync_event_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_user_id is not null then
    insert into public.event_members(event_id, user_id, role)
    values (new.event_id, new.owner_user_id, 'owner')
    on conflict (event_id, user_id) do update set role = 'owner';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_event_owner_membership on public.events;
create trigger trg_sync_event_owner_membership
after insert or update of owner_user_id on public.events
for each row execute function public.sync_event_owner_membership();

-- Helper used by RLS. SECURITY DEFINER avoids recursive policy checks.
create or replace function public.is_event_member(target_event_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.event_members em
    where em.event_id = target_event_id and em.user_id = auth.uid()
  );
$$;

create or replace function public.is_event_manager(target_event_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.event_members em
    where em.event_id = target_event_id and em.user_id = auth.uid() and em.role in ('owner','manager')
  );
$$;

-- Strict policies are intentionally enabled here. Legacy rows with NULL owner_user_id
-- will not be visible until an authenticated organizer assigns an owner.
alter table public.events enable row level security;
alter table public.event_members enable row level security;

drop policy if exists events_authenticated_select on public.events;
create policy events_authenticated_select on public.events
for select to authenticated
using (public.is_event_member(event_id));

drop policy if exists events_authenticated_insert on public.events;
create policy events_authenticated_insert on public.events
for insert to authenticated
with check (owner_user_id = auth.uid());

drop policy if exists events_authenticated_update on public.events;
create policy events_authenticated_update on public.events
for update to authenticated
using (public.is_event_member(event_id))
with check (public.is_event_member(event_id));

drop policy if exists events_authenticated_delete on public.events;
create policy events_authenticated_delete on public.events
for delete to authenticated
using (public.is_event_manager(event_id));

drop policy if exists event_members_select on public.event_members;
create policy event_members_select on public.event_members
for select to authenticated
using (public.is_event_member(event_id));

drop policy if exists event_members_insert on public.event_members;
create policy event_members_insert on public.event_members
for insert to authenticated
with check (public.is_event_manager(event_id));

drop policy if exists event_members_update on public.event_members;
create policy event_members_update on public.event_members
for update to authenticated
using (public.is_event_manager(event_id))
with check (public.is_event_manager(event_id));

drop policy if exists event_members_delete on public.event_members;
create policy event_members_delete on public.event_members
for delete to authenticated
using (public.is_event_manager(event_id));

grant execute on function public.is_event_member(text) to authenticated;
grant execute on function public.is_event_manager(text) to authenticated;
