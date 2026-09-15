-- BeyDen Section 9: audit-history read access.
-- Managers/owners can view the existing Section 3 event_audit trail.
-- Referees do not receive audit-table access; their match actions remain
-- visible through the live tournament state and are recorded server-side.

begin;

alter table public.event_audit enable row level security;

drop policy if exists event_audit_manager_select on public.event_audit;
create policy event_audit_manager_select on public.event_audit
for select to authenticated
using (public.is_event_manager(event_id));

grant select on public.event_audit to authenticated;

commit;
