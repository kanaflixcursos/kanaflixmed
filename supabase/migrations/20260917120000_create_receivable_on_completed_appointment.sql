-- Creates one operational receivable when a paid appointment is completed.
-- The trigger is security definer so a professional can complete an appointment
-- without receiving direct read/write access to the finance tables.
create or replace function public.create_receivable_for_completed_appointment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  patient_name text;
  service_name text;
begin
  if new.status <> 'COMPLETED' or new.price_cents <= 0 then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status = 'COMPLETED' then
    return new;
  end if;

  select p.display_name, s.name
    into patient_name, service_name
    from public.patients p
    join public.services s on s.id = new.service_id
   where p.id = new.patient_id;

  insert into public.financial_entries (
    organization_id,
    appointment_id,
    patient_id,
    type,
    status,
    description,
    amount_cents,
    due_date,
    created_by
  ) values (
    new.organization_id,
    new.id,
    new.patient_id,
    'RECEIVABLE',
    'PENDING',
    coalesce(service_name, 'Consulta') || ' · ' || coalesce(patient_name, 'Paciente'),
    new.price_cents,
    timezone('UTC', now())::date,
    auth.uid()
  )
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists appointments_create_receivable_after_completion on public.appointments;
create trigger appointments_create_receivable_after_completion
after insert or update of status on public.appointments
for each row execute procedure public.create_receivable_for_completed_appointment();
