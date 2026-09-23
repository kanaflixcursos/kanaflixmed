-- Keep the existing patient identifier for compatibility, but make the full legal name
-- the sole name presented throughout the product.
update public.patients
set legal_name = coalesce(nullif(trim(legal_name), ''), trim(display_name)),
    display_name = coalesce(nullif(trim(legal_name), ''), trim(display_name))
where legal_name is distinct from display_name or legal_name is null;

-- Check-in and "start appointment" become one action for new consultations.
-- Retain CHECKED_IN as a legacy state so existing appointments can still advance.
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
    when 'SCHEDULED' then next_status in ('CONFIRMED', 'NO_SHOW', 'CANCELLED')
    when 'CONFIRMED' then next_status in ('IN_PROGRESS', 'NO_SHOW', 'CANCELLED')
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
