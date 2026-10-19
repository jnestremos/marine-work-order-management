-- Row access follows the mock session: vessel, role, and member from the dropdowns.
-- The Data API reads those from request headers. Supabase Auth is not used.

create function private.session_member_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('marine.member_id', true), '')::uuid;
$$;

create function private.session_role()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('marine.role', true), '');
$$;

create function private.session_vessel_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('marine.vessel_id', true), '')::uuid;
$$;

create function private.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.session_role() = 'admin';
$$;

create function private.is_captain()
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.session_role() = 'captain';
$$;

create function private.is_crew()
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.session_role() = 'crew';
$$;

create function private.assigned_to_vessel(p_member_id uuid, p_vessel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.assignments
    where member_id = p_member_id
      and vessel_id = p_vessel_id
  );
$$;

create function private.can_see_work_order(p_work_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.work_orders wo
    where wo.id = p_work_order_id
      and (
        private.is_admin()
        or (
          private.is_captain()
          and wo.created_by_id = private.session_member_id()
          and wo.vessel_id = private.session_vessel_id()
        )
        or (
          private.is_crew()
          and wo.assignee_id = private.session_member_id()
        )
      )
  );
$$;

create function private.set_marine_session()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  headers json := nullif(current_setting('request.headers', true), '')::json;
  member_header text;
  role_header text;
  vessel_header text;
  found_member public.members%rowtype;
  vessel_is_active boolean;
begin
  perform set_config('marine.member_id', '', true);
  perform set_config('marine.role', '', true);
  perform set_config('marine.vessel_id', '', true);

  if headers is null then
    return;
  end if;

  member_header := headers->>'x-marine-member-id';
  role_header := headers->>'x-marine-role';
  vessel_header := headers->>'x-marine-vessel-id';

  if member_header is null or role_header is null or vessel_header is null then
    return;
  end if;

  if role_header not in ('admin', 'captain', 'crew') then
    return;
  end if;

  select *
    into found_member
  from public.members
  where id = member_header::uuid;

  if found_member.id is null
    or not found_member.active
    or found_member.role::text <> role_header
  then
    return;
  end if;

  select active
    into vessel_is_active
  from public.vessels
  where id = vessel_header::uuid;

  if vessel_is_active is not true then
    return;
  end if;

  if role_header in ('captain', 'crew')
    and not private.assigned_to_vessel(found_member.id, vessel_header::uuid)
  then
    return;
  end if;

  perform set_config('marine.member_id', found_member.id::text, true);
  perform set_config('marine.role', role_header, true);
  perform set_config('marine.vessel_id', vessel_header, true);
exception
  when invalid_text_representation then
    return;
end;
$$;

create function private.sea_services_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.session_role() in ('captain', 'crew') then
    new.status := 'pending';
  end if;
  return new;
end;
$$;

create trigger sea_services_before_update
before update on public.sea_services
for each row
execute function private.sea_services_before_update();

revoke all on all functions in schema private from public, anon, authenticated;
grant usage on schema private to anon;
grant execute on function private.set_marine_session() to anon;

alter role authenticator set pgrst.db_pre_request = 'private.set_marine_session';
notify pgrst, 'reload config';

grant select, insert, update on public.members to anon;
grant select, insert, update on public.vessels to anon;
grant select, insert, delete on public.assignments to anon;
grant select, insert, update, delete on public.service_records to anon;
grant select, insert, update, delete on public.sea_services to anon;
grant select, insert, update on public.work_orders to anon;
grant select, insert, update on public.work_order_solutions to anon;

revoke truncate on
  public.members,
  public.vessels,
  public.assignments,
  public.service_records,
  public.sea_services,
  public.work_orders,
  public.work_order_solutions
from anon, authenticated;

create policy members_select on public.members
for select to anon
using (
  (select private.is_admin())
  or id = (select private.session_member_id())
  or (
    (select private.is_captain())
    and role = 'crew'
    and (select private.assigned_to_vessel(id, private.session_vessel_id()))
  )
);

create policy members_insert on public.members
for insert to anon
with check ((select private.is_admin()));

create policy members_update on public.members
for update to anon
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy vessels_select on public.vessels
for select to anon
using (
  (select private.is_admin())
  or (select private.assigned_to_vessel(private.session_member_id(), id))
);

create policy vessels_insert on public.vessels
for insert to anon
with check ((select private.is_admin()));

create policy vessels_update on public.vessels
for update to anon
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy assignments_select on public.assignments
for select to anon
using (
  (select private.is_admin())
  or (
    (select private.is_captain())
    and vessel_id = (select private.session_vessel_id())
  )
  or (
    (select private.is_crew())
    and member_id = (select private.session_member_id())
  )
);

create policy assignments_insert on public.assignments
for insert to anon
with check ((select private.is_admin()));

create policy assignments_delete on public.assignments
for delete to anon
using ((select private.is_admin()));

create policy service_records_select on public.service_records
for select to anon
using (
  (select private.is_admin())
  or member_id = (select private.session_member_id())
);

create policy service_records_write on public.service_records
for all to anon
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy sea_services_select on public.sea_services
for select to anon
using (
  (select private.is_admin())
  or member_id = (select private.session_member_id())
);

create policy sea_services_insert on public.sea_services
for insert to anon
with check (
  created_by_id = (select private.session_member_id())
  and (
    (
      (select private.is_admin())
      and exists (
        select 1
        from public.members owner
        where owner.id = member_id
          and owner.role <> 'admin'
      )
    )
    or (
      (select private.session_role()) in ('captain', 'crew')
      and member_id = (select private.session_member_id())
    )
  )
);

create policy sea_services_update on public.sea_services
for update to anon
using (
  (select private.is_admin())
  or member_id = (select private.session_member_id())
)
with check (
  (select private.is_admin())
  or (
    (select private.session_role()) in ('captain', 'crew')
    and member_id = (select private.session_member_id())
    and created_by_id = (select private.session_member_id())
  )
);

create policy sea_services_delete on public.sea_services
for delete to anon
using (
  (select private.is_admin())
  or member_id = (select private.session_member_id())
);

create policy work_orders_select on public.work_orders
for select to anon
using ((select private.can_see_work_order(id)));

create policy work_orders_insert on public.work_orders
for insert to anon
with check (
  (select private.is_captain())
  and created_by_id = (select private.session_member_id())
  and vessel_id = (select private.session_vessel_id())
);

create policy work_orders_update on public.work_orders
for update to anon
using (
  (select private.is_admin())
  or (
    (select private.is_captain())
    and created_by_id = (select private.session_member_id())
    and vessel_id = (select private.session_vessel_id())
  )
)
with check (
  (select private.is_admin())
  or (
    (select private.is_captain())
    and created_by_id = (select private.session_member_id())
    and vessel_id = (select private.session_vessel_id())
  )
);

create policy work_order_solutions_select on public.work_order_solutions
for select to anon
using ((select private.can_see_work_order(work_order_id)));

create policy work_order_solutions_insert on public.work_order_solutions
for insert to anon
with check (
  (select private.is_crew())
  and posted_by = (select private.session_member_id())
  and (select private.can_see_work_order(work_order_id))
);

create policy work_order_solutions_update on public.work_order_solutions
for update to anon
using (
  (select private.is_admin())
  or (
    (select private.is_captain())
    and (select private.can_see_work_order(work_order_id))
  )
)
with check (
  (select private.is_admin())
  or (
    (select private.is_captain())
    and (select private.can_see_work_order(work_order_id))
  )
);

comment on function private.set_marine_session() is
  'Loads the dropdown session from x-marine-member-id, x-marine-role, and x-marine-vessel-id. An empty or mismatched session sees no rows.';
