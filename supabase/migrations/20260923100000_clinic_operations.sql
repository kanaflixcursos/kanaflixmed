create extension if not exists btree_gist;

alter table public.organizations
  add column if not exists phone text,
  add column if not exists contact_email citext,
  add column if not exists address text;

create table if not exists public.appointment_reschedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  previous_starts_at timestamptz not null,
  previous_ends_at timestamptz not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  actor_user_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  check (previous_ends_at > previous_starts_at),
  check (ends_at > starts_at)
);

create index if not exists appointment_reschedules_org_occurred
  on public.appointment_reschedules (organization_id, occurred_at desc);
create index if not exists appointment_reschedules_appointment_occurred
  on public.appointment_reschedules (appointment_id, occurred_at desc);
alter table public.appointment_reschedules enable row level security;
grant select on public.appointment_reschedules to authenticated;
create policy appointment_reschedules_member_read on public.appointment_reschedules
  for select using (public.is_org_member(organization_id));

-- All appointment mutations now go through the transactional RPCs below.
drop policy if exists appointments_member_access on public.appointments;
create policy appointments_member_read on public.appointments
  for select using (public.is_org_member(organization_id));
revoke insert, update, delete on public.appointments from authenticated;

drop policy if exists appointment_events_member_access on public.appointment_status_events;
create policy appointment_events_member_read on public.appointment_status_events
  for select using (public.is_org_member(organization_id));
revoke insert, update, delete on public.appointment_status_events from authenticated;

drop policy if exists encounters_professional_write on public.encounters;
create policy encounters_professional_write on public.encounters for insert with check (
  public.is_org_member(organization_id) and professional_id = auth.uid() and status = 'DRAFT'
  and exists (select 1 from public.appointments a where a.id = appointment_id
    and a.organization_id = encounters.organization_id and a.patient_id = encounters.patient_id
    and a.professional_id = auth.uid())
);
drop policy if exists encounters_professional_update on public.encounters;
create policy encounters_professional_update on public.encounters for update using (
  public.is_org_member(organization_id) and professional_id = auth.uid() and status = 'DRAFT'
) with check (
  public.is_org_member(organization_id) and professional_id = auth.uid() and status = 'DRAFT'
  and exists (select 1 from public.appointments a where a.id = appointment_id
    and a.organization_id = encounters.organization_id and a.patient_id = encounters.patient_id
    and a.professional_id = auth.uid())
);
revoke insert, update, delete on public.encounters from authenticated;
revoke update on public.organizations, public.memberships from authenticated;

-- A conflicting pair already in production must be reconciled before this constraint can be added.
do $$
begin
  if not exists (
    select 1 from public.appointments a
    join public.appointments b on a.organization_id = b.organization_id
      and a.professional_id = b.professional_id and a.id < b.id
      and a.starts_at < b.ends_at and b.starts_at < a.ends_at
    where a.status not in ('CANCELLED', 'NO_SHOW')
      and b.status not in ('CANCELLED', 'NO_SHOW')
  ) then
    alter table public.appointments
      add constraint appointments_no_active_overlap
      exclude using gist (
        organization_id with =,
        professional_id with =,
        tstzrange(starts_at, ends_at, '[)') with &&
      ) where (status not in ('CANCELLED', 'NO_SHOW'));
  else
    raise exception 'Existing active appointments overlap; reconcile them before applying appointments_no_active_overlap';
  end if;
end;
$$;

create or replace function public.create_appointment_atomic(
  target_org uuid,
  target_patient uuid,
  target_service uuid,
  target_starts_at timestamptz,
  target_professional uuid default null,
  target_note text default null
)
returns public.appointments
language plpgsql security definer set search_path = public
as $$
declare
  actor uuid := auth.uid();
  actor_role public.membership_role;
  chosen_professional uuid;
  service_row public.services;
  created public.appointments;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  select role into actor_role from public.memberships
   where organization_id = target_org and user_id = actor and status = 'ACTIVE';
  if actor_role is null then raise exception 'ORG_FORBIDDEN'; end if;
  if actor_role = 'FINANCE' then raise exception 'APPOINTMENT_FORBIDDEN'; end if;
  chosen_professional := coalesce(target_professional, actor);
  if chosen_professional <> actor and actor_role not in ('ADMIN', 'RECEPTION') then
    raise exception 'APPOINTMENT_FORBIDDEN';
  end if;
  if not exists (select 1 from public.memberships m where m.organization_id = target_org
      and m.user_id = chosen_professional and m.status = 'ACTIVE' and m.role in ('ADMIN', 'PROFESSIONAL')) then
    raise exception 'PROFESSIONAL_NOT_FOUND';
  end if;
  if target_starts_at <= now() then raise exception 'APPOINTMENT_MUST_BE_FUTURE'; end if;
  if not exists (select 1 from public.patients p where p.id = target_patient
      and p.organization_id = target_org and p.active) then raise exception 'PATIENT_NOT_FOUND'; end if;
  select * into service_row from public.services s where s.id = target_service
      and s.organization_id = target_org and s.active;
  if not found then raise exception 'SERVICE_NOT_FOUND'; end if;

  insert into public.appointments (organization_id, patient_id, service_id, professional_id,
      starts_at, ends_at, operational_note, price_cents)
    values (target_org, target_patient, target_service, chosen_professional,
      target_starts_at, target_starts_at + make_interval(mins => service_row.duration_minutes),
      nullif(trim(coalesce(target_note, '')), ''), service_row.price_cents)
    returning * into created;
  insert into public.appointment_status_events (organization_id, appointment_id, from_status, to_status, actor_user_id)
    values (target_org, created.id, null, 'SCHEDULED', actor);
  insert into public.audit_events (organization_id, actor_user_id, action, resource_type, resource_id)
    values (target_org, actor, 'APPOINTMENT_CREATED', 'APPOINTMENT', created.id);
  return created;
exception when exclusion_violation then
  raise exception 'APPOINTMENT_CONFLICT';
end;
$$;

create or replace function public.transition_appointment_atomic(
  target_appointment uuid,
  expected_version integer,
  next_status public.appointment_status,
  change_reason text default null
)
returns public.appointments
language plpgsql security definer set search_path = public
as $$
declare
  actor uuid := auth.uid();
  current_row public.appointments;
  previous_status public.appointment_status;
  actor_role public.membership_role;
  permitted boolean := false;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into current_row from public.appointments where id = target_appointment for update;
  if not found then raise exception 'APPOINTMENT_NOT_FOUND'; end if;
  if not public.is_org_member(current_row.organization_id) then raise exception 'APPOINTMENT_FORBIDDEN'; end if;
  select role into actor_role from public.memberships where organization_id = current_row.organization_id and user_id = actor and status = 'ACTIVE';
  if actor_role = 'FINANCE' then raise exception 'APPOINTMENT_FORBIDDEN'; end if;
  if actor_role = 'PROFESSIONAL' and current_row.professional_id <> actor then raise exception 'APPOINTMENT_FORBIDDEN'; end if;
  permitted := case current_row.status
    when 'SCHEDULED' then next_status in ('CONFIRMED', 'CHECKED_IN', 'NO_SHOW', 'CANCELLED')
    when 'CONFIRMED' then next_status in ('CHECKED_IN', 'NO_SHOW', 'CANCELLED')
    when 'CHECKED_IN' then next_status in ('IN_PROGRESS', 'NO_SHOW', 'CANCELLED')
    when 'IN_PROGRESS' then next_status = 'COMPLETED'
    else false end;
  if not permitted then raise exception 'INVALID_STATUS_TRANSITION'; end if;
  if current_row.version <> expected_version then raise exception 'APPOINTMENT_CONFLICT'; end if;
  previous_status := current_row.status;
  if next_status in ('CANCELLED', 'NO_SHOW') and length(trim(coalesce(change_reason, ''))) < 2 then
    raise exception 'REASON_REQUIRED';
  end if;
  update public.appointments set status = next_status, version = version + 1
   where id = target_appointment returning * into current_row;
  insert into public.appointment_status_events (organization_id, appointment_id, from_status, to_status, reason, actor_user_id)
    values (current_row.organization_id, current_row.id, previous_status, next_status,
      nullif(trim(change_reason), ''), actor);
  insert into public.audit_events (organization_id, actor_user_id, action, resource_type, resource_id, metadata)
    values (current_row.organization_id, actor, 'APPOINTMENT_STATUS_UPDATED', 'APPOINTMENT', current_row.id,
      jsonb_build_object('to', next_status, 'reason', nullif(trim(change_reason), '')));
  return current_row;
end;
$$;

create or replace function public.reschedule_appointment_atomic(
  target_appointment uuid,
  expected_version integer,
  new_starts_at timestamptz,
  change_reason text default null
)
returns public.appointments
language plpgsql security definer set search_path = public
as $$
declare
  actor uuid := auth.uid();
  current_row public.appointments;
  service_duration integer;
  actor_role public.membership_role;
  new_ends_at timestamptz;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into current_row from public.appointments where id = target_appointment for update;
  if not found then raise exception 'APPOINTMENT_NOT_FOUND'; end if;
  if not public.is_org_member(current_row.organization_id) then raise exception 'APPOINTMENT_FORBIDDEN'; end if;
  select role into actor_role from public.memberships where organization_id = current_row.organization_id and user_id = actor and status = 'ACTIVE';
  if actor_role = 'FINANCE' then raise exception 'APPOINTMENT_FORBIDDEN'; end if;
  if actor_role = 'PROFESSIONAL' and current_row.professional_id <> actor then raise exception 'APPOINTMENT_FORBIDDEN'; end if;
  if current_row.version <> expected_version then raise exception 'APPOINTMENT_CONFLICT'; end if;
  if current_row.status not in ('SCHEDULED', 'CONFIRMED') then raise exception 'RESCHEDULE_NOT_ALLOWED'; end if;
  if new_starts_at <= now() then raise exception 'APPOINTMENT_MUST_BE_FUTURE'; end if;
  if new_starts_at = current_row.starts_at then raise exception 'APPOINTMENT_TIME_UNCHANGED'; end if;
  select duration_minutes into service_duration from public.services where id = current_row.service_id;
  new_ends_at := new_starts_at + make_interval(mins => service_duration);
  insert into public.appointment_reschedules (organization_id, appointment_id, previous_starts_at,
      previous_ends_at, starts_at, ends_at, reason, actor_user_id)
    values (current_row.organization_id, current_row.id, current_row.starts_at,
      current_row.ends_at, new_starts_at, new_ends_at, nullif(trim(change_reason), ''), actor);
  update public.appointments set starts_at = new_starts_at, ends_at = new_ends_at,
      version = version + 1 where id = current_row.id returning * into current_row;
  insert into public.audit_events (organization_id, actor_user_id, action, resource_type, resource_id, metadata)
    values (current_row.organization_id, actor, 'APPOINTMENT_RESCHEDULED', 'APPOINTMENT', current_row.id,
      jsonb_build_object('starts_at', new_starts_at, 'reason', nullif(trim(change_reason), '')));
  return current_row;
exception when exclusion_violation then
  raise exception 'APPOINTMENT_CONFLICT';
end;
$$;

revoke all on function public.create_appointment_atomic(uuid, uuid, uuid, timestamptz, uuid, text) from public;
revoke all on function public.transition_appointment_atomic(uuid, integer, public.appointment_status, text) from public;
revoke all on function public.reschedule_appointment_atomic(uuid, integer, timestamptz, text) from public;
grant execute on function public.create_appointment_atomic(uuid, uuid, uuid, timestamptz, uuid, text) to authenticated;
grant execute on function public.transition_appointment_atomic(uuid, integer, public.appointment_status, text) to authenticated;
grant execute on function public.reschedule_appointment_atomic(uuid, integer, timestamptz, text) to authenticated;

create or replace function public.save_encounter_atomic(
  target_appointment uuid,
  expected_version integer,
  encounter_data jsonb,
  finalize_encounter boolean default false
)
returns public.encounters
language plpgsql security definer set search_path = public
as $$
declare
  actor uuid := auth.uid();
  appointment_row public.appointments;
  encounter_row public.encounters;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into appointment_row from public.appointments where id = target_appointment for update;
  if not found then raise exception 'APPOINTMENT_NOT_FOUND'; end if;
  if not public.is_org_member(appointment_row.organization_id) then raise exception 'ENCOUNTER_FORBIDDEN'; end if;
  if appointment_row.professional_id <> actor then raise exception 'ENCOUNTER_FORBIDDEN'; end if;
  select * into encounter_row from public.encounters where appointment_id = target_appointment for update;
  if found and encounter_row.status = 'FINALIZED' then raise exception 'ENCOUNTER_FINALIZED'; end if;
  if found and encounter_row.version <> expected_version then raise exception 'ENCOUNTER_CONFLICT'; end if;
  if finalize_encounter and appointment_row.status <> 'COMPLETED' then raise exception 'APPOINTMENT_NOT_COMPLETED'; end if;

  if encounter_row.id is null then
    insert into public.encounters (organization_id, appointment_id, patient_id, professional_id,
        status, chief_complaint, history, medical_history, allergies, physical_exam, assessment,
        plan, additional_notes, finalized_at, finalized_by)
    values (appointment_row.organization_id, appointment_row.id, appointment_row.patient_id, actor,
        case when finalize_encounter then 'FINALIZED'::public.encounter_status else 'DRAFT'::public.encounter_status end,
        nullif(trim(encounter_data->>'chiefComplaint'), ''), nullif(trim(encounter_data->>'history'), ''),
        nullif(trim(encounter_data->>'medicalHistory'), ''), nullif(trim(encounter_data->>'allergies'), ''),
        nullif(trim(encounter_data->>'physicalExam'), ''), nullif(trim(encounter_data->>'assessment'), ''),
        nullif(trim(encounter_data->>'plan'), ''), nullif(trim(encounter_data->>'additionalNotes'), ''),
        case when finalize_encounter then now() else null end,
        case when finalize_encounter then actor else null end)
    returning * into encounter_row;
  else
    update public.encounters set
      chief_complaint = nullif(trim(encounter_data->>'chiefComplaint'), ''),
      history = nullif(trim(encounter_data->>'history'), ''),
      medical_history = nullif(trim(encounter_data->>'medicalHistory'), ''),
      allergies = nullif(trim(encounter_data->>'allergies'), ''),
      physical_exam = nullif(trim(encounter_data->>'physicalExam'), ''),
      assessment = nullif(trim(encounter_data->>'assessment'), ''),
      plan = nullif(trim(encounter_data->>'plan'), ''),
      additional_notes = nullif(trim(encounter_data->>'additionalNotes'), ''),
      status = case when finalize_encounter then 'FINALIZED'::public.encounter_status else 'DRAFT'::public.encounter_status end,
      finalized_at = case when finalize_encounter then now() else null end,
      finalized_by = case when finalize_encounter then actor else null end,
      version = version + 1
    where id = encounter_row.id returning * into encounter_row;
  end if;
  insert into public.audit_events (organization_id, actor_user_id, action, resource_type, resource_id)
    values (appointment_row.organization_id, actor,
      case when finalize_encounter then 'ENCOUNTER_FINALIZED' else 'ENCOUNTER_DRAFT_SAVED' end,
      'ENCOUNTER', encounter_row.id);
  return encounter_row;
end;
$$;

create or replace function public.update_my_membership(
  target_org uuid,
  profile_data jsonb
)
returns public.memberships
language plpgsql security definer set search_path = public
as $$
declare
  updated_row public.memberships;
  display_name_value text := trim(coalesce(profile_data->>'displayName', ''));
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(display_name_value) < 2 or length(display_name_value) > 120 then raise exception 'INVALID_DISPLAY_NAME'; end if;
  update public.memberships set
    display_name = display_name_value,
    professional_title = nullif(trim(profile_data->>'professionalTitle'), ''),
    council_type = nullif(trim(profile_data->>'councilType'), ''),
    council_number = nullif(trim(profile_data->>'councilNumber'), ''),
    council_state = nullif(upper(trim(profile_data->>'councilState')), '')
  where organization_id = target_org and user_id = auth.uid() and status = 'ACTIVE'
  returning * into updated_row;
  if not found then raise exception 'MEMBERSHIP_NOT_FOUND'; end if;
  insert into public.audit_events (organization_id, actor_user_id, action, resource_type, resource_id)
    values (target_org, auth.uid(), 'MEMBERSHIP_PROFILE_UPDATED', 'MEMBERSHIP', updated_row.id);
  return updated_row;
end;
$$;

create or replace function public.clinic_team(target_org uuid)
returns table (user_id uuid, display_name text)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.is_org_member(target_org) then raise exception 'ORG_FORBIDDEN'; end if;
  return query select m.user_id, coalesce(m.display_name, 'Profissional')
    from public.memberships m where m.organization_id = target_org
      and m.status = 'ACTIVE' and m.role in ('ADMIN','PROFESSIONAL')
    order by m.display_name nulls last;
end;
$$;

create or replace function public.update_clinic_profile(
  target_org uuid,
  clinic_data jsonb
)
returns public.organizations
language plpgsql security definer set search_path = public
as $$
declare
  updated_row public.organizations;
  name_value text := trim(coalesce(clinic_data->>'name', ''));
  timezone_value text := trim(coalesce(clinic_data->>'timezone', ''));
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.has_org_role(target_org, array['ADMIN']::public.membership_role[]) then raise exception 'CLINIC_FORBIDDEN'; end if;
  if length(name_value) < 2 or length(name_value) > 120 then raise exception 'INVALID_CLINIC_NAME'; end if;
  if not exists (select 1 from pg_timezone_names where name = timezone_value) then raise exception 'INVALID_TIMEZONE'; end if;
  update public.organizations set name = name_value, timezone = timezone_value,
      phone = nullif(trim(clinic_data->>'phone'), ''),
      contact_email = nullif(trim(clinic_data->>'contactEmail'), '')::citext,
      address = nullif(trim(clinic_data->>'address'), '')
  where id = target_org returning * into updated_row;
  if not found then raise exception 'CLINIC_NOT_FOUND'; end if;
  insert into public.audit_events (organization_id, actor_user_id, action, resource_type, resource_id)
    values (target_org, auth.uid(), 'CLINIC_PROFILE_UPDATED', 'ORGANIZATION', target_org);
  return updated_row;
end;
$$;

create or replace function public.clinic_dashboard(
  target_org uuid,
  target_period text,
  anchor_date date
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  actor uuid := auth.uid();
  clinic_row public.organizations;
  actor_role public.membership_role;
  period_start date;
  period_end date;
  start_at timestamptz;
  end_at timestamptz;
  bucket_count integer;
  summary jsonb;
  upcoming jsonb;
  financial jsonb := null;
  chart jsonb;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  select o into clinic_row
    from public.organizations o join public.memberships m on m.organization_id = o.id
   where o.id = target_org and m.user_id = actor and m.status = 'ACTIVE';
  if not found then raise exception 'ORG_FORBIDDEN'; end if;
  select m.role into actor_role from public.memberships m
   where m.organization_id = target_org and m.user_id = actor and m.status = 'ACTIVE';
  if target_period not in ('day', 'week', 'month') then raise exception 'INVALID_PERIOD'; end if;
  period_start := case target_period
    when 'day' then anchor_date
    when 'week' then date_trunc('week', anchor_date::timestamp)::date
    else date_trunc('month', anchor_date::timestamp)::date end;
  period_end := case target_period
    when 'day' then period_start + 1
    when 'week' then period_start + 7
    else (period_start + interval '1 month')::date end;
  start_at := period_start::timestamp at time zone clinic_row.timezone;
  end_at := period_end::timestamp at time zone clinic_row.timezone;
  bucket_count := case when target_period = 'day' then 24 else period_end - period_start end;

  select jsonb_build_object(
    'scheduled', count(*) filter (where a.status = 'SCHEDULED'),
    'confirmed', count(*) filter (where a.status = 'CONFIRMED'),
    'realized', (select count(distinct e.appointment_id) from public.appointment_status_events e
      where e.organization_id = target_org and e.to_status = 'COMPLETED' and e.occurred_at >= start_at and e.occurred_at < end_at),
    'finalized', (select count(*) from public.encounters e where e.organization_id = target_org
      and e.status = 'FINALIZED' and e.finalized_at >= start_at and e.finalized_at < end_at),
    'pendingRecords', (select count(distinct e.appointment_id) from public.appointment_status_events e
      where e.organization_id = target_org and e.to_status = 'COMPLETED' and e.occurred_at >= start_at and e.occurred_at < end_at
      and not exists (select 1 from public.encounters n where n.appointment_id = e.appointment_id and n.status = 'FINALIZED')),
    'cancelled', (select count(distinct e.appointment_id) from public.appointment_status_events e
      where e.organization_id = target_org and e.to_status = 'CANCELLED' and e.occurred_at >= start_at and e.occurred_at < end_at),
    'rescheduled', (select count(distinct r.appointment_id) from public.appointment_reschedules r
      where r.organization_id = target_org and r.occurred_at >= start_at and r.occurred_at < end_at)
  ) into summary
  from public.appointments a where a.organization_id = target_org and a.starts_at >= start_at and a.starts_at < end_at;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', a.id, 'startsAt', a.starts_at, 'endsAt', a.ends_at, 'status', a.status,
      'patientName', p.display_name, 'serviceName', s.name, 'professionalName', coalesce(m.display_name, 'Profissional')
    ) order by a.starts_at), '[]'::jsonb)
    into upcoming
    from (select * from public.appointments a where a.organization_id = target_org
      and a.starts_at >= now() and a.status in ('SCHEDULED','CONFIRMED','CHECKED_IN','IN_PROGRESS')
      order by a.starts_at limit 5) a
    join public.patients p on p.id = a.patient_id
    join public.services s on s.id = a.service_id
    left join public.memberships m on m.organization_id = a.organization_id and m.user_id = a.professional_id;

  if actor_role in ('ADMIN', 'RECEPTION', 'FINANCE') then
    select jsonb_build_object(
      'forecastScheduled', coalesce(sum(a.price_cents) filter (where a.status = 'SCHEDULED' and a.price_cents > 0), 0),
      'forecastConfirmed', coalesce(sum(a.price_cents) filter (where a.status = 'CONFIRMED' and a.price_cents > 0), 0),
      'forecastUnpriced', count(*) filter (where a.price_cents = 0),
      'receivable', (select coalesce(sum(greatest(f.amount_cents - coalesce(paid.total, 0), 0)), 0)
        from public.financial_entries f left join lateral (
          select sum(case when p.reversed_payment_id is null then p.amount_cents else -p.amount_cents end) as total from public.payments p
          where p.financial_entry_id = f.id
        ) paid on true where f.organization_id = target_org and f.type = 'RECEIVABLE'
          and f.status in ('PENDING','PARTIAL','OVERDUE') and f.due_date >= period_start and f.due_date < period_end),
      'received', (select coalesce(sum(case when p.reversed_payment_id is null then p.amount_cents else -p.amount_cents end), 0) from public.payments p
        where p.organization_id = target_org and p.paid_at >= start_at and p.paid_at < end_at)
    ) into financial
    from public.appointments a where a.organization_id = target_org and a.starts_at >= greatest(start_at, now())
      and a.starts_at < end_at and a.status in ('SCHEDULED','CONFIRMED');
  end if;

  select coalesce(jsonb_agg(bucket order by bucket_index), '[]'::jsonb) into chart from (
    select g as bucket_index,
      jsonb_build_object(
        'label', case when target_period = 'day'
          then to_char(start_at at time zone clinic_row.timezone + g * interval '1 hour', 'HH24:00')
          else to_char(period_start + g, 'DD/MM') end,
        'realized', (select count(distinct e.appointment_id) from public.appointment_status_events e
          where e.organization_id = target_org and e.to_status = 'COMPLETED'
            and (e.occurred_at at time zone clinic_row.timezone) >= (case when target_period = 'day' then period_start::timestamp + g * interval '1 hour' else (period_start + g)::timestamp end)
            and (e.occurred_at at time zone clinic_row.timezone) < (case when target_period = 'day' then period_start::timestamp + (g + 1) * interval '1 hour' else (period_start + g + 1)::timestamp end)),
        'finalized', (select count(*) from public.encounters e where e.organization_id = target_org and e.status = 'FINALIZED'
          and (e.finalized_at at time zone clinic_row.timezone) >= (case when target_period = 'day' then period_start::timestamp + g * interval '1 hour' else (period_start + g)::timestamp end)
          and (e.finalized_at at time zone clinic_row.timezone) < (case when target_period = 'day' then period_start::timestamp + (g + 1) * interval '1 hour' else (period_start + g + 1)::timestamp end)),
        'cancelled', (select count(distinct e.appointment_id) from public.appointment_status_events e
          where e.organization_id = target_org and e.to_status = 'CANCELLED'
            and (e.occurred_at at time zone clinic_row.timezone) >= (case when target_period = 'day' then period_start::timestamp + g * interval '1 hour' else (period_start + g)::timestamp end)
            and (e.occurred_at at time zone clinic_row.timezone) < (case when target_period = 'day' then period_start::timestamp + (g + 1) * interval '1 hour' else (period_start + g + 1)::timestamp end)),
        'rescheduled', (select count(distinct r.appointment_id) from public.appointment_reschedules r
          where r.organization_id = target_org
            and (r.occurred_at at time zone clinic_row.timezone) >= (case when target_period = 'day' then period_start::timestamp + g * interval '1 hour' else (period_start + g)::timestamp end)
            and (r.occurred_at at time zone clinic_row.timezone) < (case when target_period = 'day' then period_start::timestamp + (g + 1) * interval '1 hour' else (period_start + g + 1)::timestamp end))
      ) as bucket
    from generate_series(0, bucket_count - 1) g
  ) chart_rows;

  return jsonb_build_object(
    'organizationName', clinic_row.name, 'timezone', clinic_row.timezone,
    'period', target_period, 'start', period_start, 'end', period_end,
    'summary', summary, 'upcoming', upcoming, 'financial', financial, 'series', chart
  );
end;
$$;

revoke all on function public.save_encounter_atomic(uuid, integer, jsonb, boolean) from public;
revoke all on function public.update_my_membership(uuid, jsonb) from public;
revoke all on function public.clinic_team(uuid) from public;
revoke all on function public.update_clinic_profile(uuid, jsonb) from public;
revoke all on function public.clinic_dashboard(uuid, text, date) from public;
grant execute on function public.save_encounter_atomic(uuid, integer, jsonb, boolean) to authenticated;
grant execute on function public.update_my_membership(uuid, jsonb) to authenticated;
grant execute on function public.clinic_team(uuid) to authenticated;
grant execute on function public.update_clinic_profile(uuid, jsonb) to authenticated;
grant execute on function public.clinic_dashboard(uuid, text, date) to authenticated;
