-- Captains and crew cannot leave a vessel while they still have open,
-- in-progress, or Done work orders awaiting Attest/Reject on that vessel.

create or replace function private.unresolved_codes_for_assignment(
  p_member_id uuid,
  p_vessel_id uuid
)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    array(
      select wo.code
      from public.work_orders wo
      where wo.vessel_id = p_vessel_id
        and wo.status in ('open', 'in_progress', 'done')
        and (wo.assignee_id = p_member_id or wo.created_by_id = p_member_id)
      order by substring(wo.code from '^WO-([0-9]+)$')::bigint
    ),
    '{}'
  );
$$;

create or replace function private.assignments_before_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  codes text[];
begin
  codes := private.unresolved_codes_for_assignment(old.member_id, old.vessel_id);
  if cardinality(codes) > 0 then
    raise exception 'Close or approve % before removing this assignment', private.listed(codes);
  end if;
  return old;
end;
$$;

comment on function private.unresolved_codes_for_assignment(uuid, uuid) is
  'Work-order codes that block unassign: open, in_progress, or done (awaiting captain Attest/Reject) for that member on the vessel.';
