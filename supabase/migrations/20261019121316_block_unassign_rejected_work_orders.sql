-- Crew (and linked creators) cannot leave a vessel, and cannot be deactivated,
-- while they still have rejected work orders that need another solution.

create or replace function private.unresolved_codes(p_member_id uuid, p_vessel_id uuid)
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
      where wo.status in ('open', 'in_progress', 'done', 'rejected')
        and (
          (p_member_id is not null and (wo.assignee_id = p_member_id or wo.created_by_id = p_member_id))
          or (p_vessel_id is not null and wo.vessel_id = p_vessel_id)
        )
      order by substring(wo.code from '^WO-([0-9]+)$')::bigint
    ),
    '{}'
  );
$$;

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
        and wo.status in ('open', 'in_progress', 'done', 'rejected')
        and (wo.assignee_id = p_member_id or wo.created_by_id = p_member_id)
      order by substring(wo.code from '^WO-([0-9]+)$')::bigint
    ),
    '{}'
  );
$$;

comment on function private.unresolved_codes(uuid, uuid) is
  'Work-order codes that block member/vessel deactivation: open, in_progress, done (awaiting Attest/Reject), or rejected (needs another solution).';

comment on function private.unresolved_codes_for_assignment(uuid, uuid) is
  'Work-order codes that block unassign: open, in_progress, done (awaiting Attest/Reject), or rejected (needs another solution) for that member on the vessel.';
