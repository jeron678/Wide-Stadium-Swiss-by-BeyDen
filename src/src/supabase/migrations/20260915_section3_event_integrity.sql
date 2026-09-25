-- BeyDen Section 3: event revisioning + audit trail
--
-- Apply this migration once in the Supabase SQL editor.
-- It is intentionally compatible with the existing JSON-based events model.
-- No existing event/player/match data is split into new tables yet.

begin;

alter table public.events
  add column if not exists revision bigint not null default 0;

create index if not exists events_revision_idx
  on public.events (event_id, revision);

create table if not exists public.event_audit (
  audit_id uuid primary key default gen_random_uuid(),
  event_id text not null,
  revision bigint not null,
  action text not null default 'UPDATE',
  changed_columns text[] not null default '{}',
  created_at timestamptz not null default now(),
  actor_user_id uuid null
);

create index if not exists event_audit_event_idx
  on public.event_audit (event_id, created_at desc);

alter table public.event_audit enable row level security;

create or replace function public.beyden_events_revision_guard()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    new.revision := old.revision + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists beyden_events_revision_guard on public.events;
create trigger beyden_events_revision_guard
before update on public.events
for each row
execute function public.beyden_events_revision_guard();

create or replace function public.beyden_events_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  changed text[] := '{}';
begin
  if tg_op = 'INSERT' then
    insert into public.event_audit(event_id, revision, action, changed_columns, actor_user_id)
    values (new.event_id::text, new.revision, 'INSERT', array['*'], auth.uid());
    return new;
  end if;

  if new.name is distinct from old.name then changed := array_append(changed, 'name'); end if;
  if new.players is distinct from old.players then changed := array_append(changed, 'players'); end if;
  if new.matches is distinct from old.matches then changed := array_append(changed, 'matches'); end if;
  if new.current_round is distinct from old.current_round then changed := array_append(changed, 'current_round'); end if;
  if new.max_rounds is distinct from old.max_rounds then changed := array_append(changed, 'max_rounds'); end if;
  if new.status is distinct from old.status then changed := array_append(changed, 'status'); end if;
  if new.format is distinct from old.format then changed := array_append(changed, 'format'); end if;

  insert into public.event_audit(event_id, revision, action, changed_columns, actor_user_id)
  values (new.event_id::text, new.revision, 'UPDATE', changed, auth.uid());

  return new;
end;
$$;

drop trigger if exists beyden_events_audit on public.events;
create trigger beyden_events_audit
after insert or update on public.events
for each row
execute function public.beyden_events_audit();

commit;
