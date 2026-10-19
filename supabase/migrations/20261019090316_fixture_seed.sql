-- Seed sample marine data with triggers paused so historical dates, codes, and
-- solution history stay as the screens show them. Row ids use column defaults
-- (gen_random_uuid). New rows after this still run the triggers.

alter table public.members disable trigger user;
alter table public.vessels disable trigger user;
alter table public.assignments disable trigger user;
alter table public.service_records disable trigger user;
alter table public.sea_services disable trigger user;
alter table public.work_orders disable trigger user;
alter table public.work_order_solutions disable trigger user;

insert into public.members (first_name, last_name, role, active) values
  ('Avery', 'Chen', 'admin', true),
  ('Blake', 'Ortiz', 'captain', true),
  ('Casey', 'Nguyen', 'crew', true),
  ('Drew', 'Patel', 'captain', true),
  ('Eden', 'Brooks', 'crew', false),
  ('Frank', 'Adler', 'admin', true),
  ('Gina', 'Morales', 'captain', true),
  ('Harper', 'Singh', 'crew', true),
  ('Ivan', 'Brooks', 'crew', true),
  ('June', 'Okonkwo', 'captain', true),
  ('Kai', 'Nakamura', 'crew', true);

insert into public.vessels (name, active) values
  ('MV Horizon', true),
  ('MV Aurora', true),
  ('MV Retired', false);

insert into public.assignments (member_id, vessel_id)
select m.id, v.id
from (
  values
    ('Blake', 'Ortiz', 'MV Horizon'),
    ('Casey', 'Nguyen', 'MV Horizon'),
    ('Drew', 'Patel', 'MV Aurora'),
    ('Harper', 'Singh', 'MV Horizon'),
    ('Ivan', 'Brooks', 'MV Horizon'),
    ('Kai', 'Nakamura', 'MV Horizon')
) as link(first_name, last_name, vessel_name)
join public.members m
  on m.first_name = link.first_name
 and m.last_name = link.last_name
join public.vessels v
  on v.name = link.vessel_name;

insert into public.service_records (member_id, vessel_id, role, start_date, end_date)
select m.id, v.id, link.role::public.app_role, link.start_date::date, link.end_date::date
from (
  values
    ('Blake', 'Ortiz', 'MV Horizon', 'captain', '2024-03-01', null),
    ('Blake', 'Ortiz', 'MV Retired', 'captain', '2021-06-15', '2024-02-20'),
    ('Casey', 'Nguyen', 'MV Horizon', 'crew', '2023-11-01', null),
    ('Drew', 'Patel', 'MV Aurora', 'captain', '2022-04-01', null),
    ('Harper', 'Singh', 'MV Horizon', 'crew', '2024-08-01', null)
) as link(first_name, last_name, vessel_name, role, start_date, end_date)
join public.members m
  on m.first_name = link.first_name
 and m.last_name = link.last_name
join public.vessels v
  on v.name = link.vessel_name;

insert into public.sea_services (
  member_id, vessel_id, role, sign_on_date, sign_on_port, sign_off_date, sign_off_port, status, created_by_id
)
select
  m.id,
  v.id,
  link.role::public.app_role,
  link.sign_on_date::date,
  link.sign_on_port,
  link.sign_off_date::date,
  link.sign_off_port,
  link.status::public.review_status,
  admin.id
from (
  values
    ('Blake', 'Ortiz', 'MV Horizon', 'captain', '2024-03-01', 'Singapore', '2024-09-12', 'Rotterdam', 'accepted'),
    ('Blake', 'Ortiz', 'MV Retired', 'captain', '2022-01-10', 'Manila', '2022-07-18', 'Busan', 'accepted'),
    ('Casey', 'Nguyen', 'MV Horizon', 'crew', '2025-02-04', 'Manila', '2025-08-19', 'Singapore', 'accepted'),
    ('Drew', 'Patel', 'MV Aurora', 'captain', '2025-01-06', 'Dubai', '2025-06-30', 'Mumbai', 'accepted'),
    ('Harper', 'Singh', 'MV Horizon', 'crew', '2025-03-15', 'Hong Kong', '2025-09-01', 'Kaohsiung', 'accepted')
) as link(
  first_name, last_name, vessel_name, role, sign_on_date, sign_on_port, sign_off_date, sign_off_port, status
)
join public.members m
  on m.first_name = link.first_name
 and m.last_name = link.last_name
join public.vessels v
  on v.name = link.vessel_name
join public.members admin
  on admin.first_name = 'Avery'
 and admin.last_name = 'Chen';

insert into public.work_orders (code, vessel_id, title, issue, status, assignee_id, created_by_id)
select
  link.code,
  v.id,
  link.title,
  link.issue,
  link.status::public.work_order_status,
  assignee.id,
  captain.id
from (
  values
    (
      'WO-1001',
      'MV Horizon',
      'Starboard navigation light',
      'The starboard navigation light stays dark after the breaker is reset.',
      'open',
      'Casey', 'Nguyen',
      'Blake', 'Ortiz'
    ),
    (
      'WO-1002',
      'MV Horizon',
      'Bilge pump seal',
      'The engine-room bilge pump weeps around the shaft seal.',
      'in_progress',
      'Harper', 'Singh',
      'Blake', 'Ortiz'
    ),
    (
      'WO-1003',
      'MV Horizon',
      'VHF radio check',
      'Channel 16 drops out during the radio check.',
      'done',
      'Ivan', 'Brooks',
      'Blake', 'Ortiz'
    ),
    (
      'WO-1004',
      'MV Horizon',
      'Fire damper latch',
      'The galley fire damper latch does not hold closed.',
      'open',
      'Kai', 'Nakamura',
      'Blake', 'Ortiz'
    )
) as link(
  code, vessel_name, title, issue, status,
  assignee_first, assignee_last, captain_first, captain_last
)
join public.vessels v
  on v.name = link.vessel_name
join public.members assignee
  on assignee.first_name = link.assignee_first
 and assignee.last_name = link.assignee_last
join public.members captain
  on captain.first_name = link.captain_first
 and captain.last_name = link.captain_last;

insert into public.work_order_solutions (work_order_id, body, status, posted_at, posted_by)
select
  wo.id,
  link.body,
  link.status::public.review_status,
  link.posted_at::timestamptz,
  crew.id
from (
  values
    (
      'WO-1003',
      'Tightened the antenna mount.',
      'rejected',
      '2026-10-10T08:15:00.000Z',
      'Ivan', 'Brooks'
    ),
    (
      'WO-1003',
      'Replaced the antenna connector and confirmed a clear radio check.',
      'pending',
      '2026-10-12T14:40:00.000Z',
      'Ivan', 'Brooks'
    )
) as link(code, body, status, posted_at, first_name, last_name)
join public.work_orders wo
  on wo.code = link.code
join public.members crew
  on crew.first_name = link.first_name
 and crew.last_name = link.last_name;

alter table public.members enable trigger user;
alter table public.vessels enable trigger user;
alter table public.assignments enable trigger user;
alter table public.service_records enable trigger user;
alter table public.sea_services enable trigger user;
alter table public.work_orders enable trigger user;
alter table public.work_order_solutions enable trigger user;

create function public.session_choices()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'vessels', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'active', active) order by name)
      from public.vessels
    ), '[]'::jsonb),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'firstName', first_name,
        'lastName', last_name,
        'role', role,
        'active', active
      ) order by last_name, first_name)
      from public.members
    ), '[]'::jsonb),
    'assignments', coalesce((
      select jsonb_agg(jsonb_build_object('memberId', member_id, 'vesselId', vessel_id))
      from public.assignments
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.session_choices() from public;
grant execute on function public.session_choices() to anon;

comment on function public.session_choices() is
  'Login catalog for the vessel, role, and member dropdowns. Row access for everything else stays on the session policies.';
