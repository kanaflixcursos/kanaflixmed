create table public.encounter_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null check (mime_type in ('application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  size_bytes integer not null check (size_bytes between 1 and 4194304),
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index encounter_attachments_appointment on public.encounter_attachments (organization_id, appointment_id, created_at desc);
alter table public.encounter_attachments enable row level security;
create policy encounter_attachments_read on public.encounter_attachments for select to authenticated using (
  public.is_org_member(organization_id) and exists (
    select 1 from public.appointments a where a.id = appointment_id and a.organization_id = encounter_attachments.organization_id
      and (a.professional_id = auth.uid() or public.has_org_role(a.organization_id, array['ADMIN']::public.membership_role[]))
  )
);
create policy encounter_attachments_insert on public.encounter_attachments for insert to authenticated with check (
  public.is_org_member(organization_id) and uploaded_by = auth.uid()
  and storage_path like organization_id::text || '/' || appointment_id::text || '/%'
  and exists (
    select 1 from public.appointments a where a.id = appointment_id and a.organization_id = encounter_attachments.organization_id
      and a.patient_id = encounter_attachments.patient_id and a.professional_id = auth.uid()
      and a.status in ('CHECKED_IN', 'IN_PROGRESS', 'COMPLETED')
      and not exists (select 1 from public.encounters e where e.appointment_id = a.id and e.status = 'FINALIZED')
  )
);
grant select, insert on public.encounter_attachments to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('encounter-attachments', 'encounter-attachments', false, 4194304,
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;

create policy encounter_storage_read on storage.objects for select to authenticated using (
  bucket_id = 'encounter-attachments' and exists (
    select 1 from public.appointments a
    where a.organization_id::text = split_part(name, '/', 1)
      and a.id::text = split_part(name, '/', 2)
      and public.is_org_member(a.organization_id)
      and (a.professional_id = auth.uid() or public.has_org_role(a.organization_id, array['ADMIN']::public.membership_role[]))
  )
);
create policy encounter_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'encounter-attachments' and exists (
    select 1 from public.appointments a
    where a.organization_id::text = split_part(name, '/', 1)
      and a.id::text = split_part(name, '/', 2)
      and a.professional_id = auth.uid()
      and public.is_org_member(a.organization_id)
      and a.status in ('CHECKED_IN', 'IN_PROGRESS', 'COMPLETED')
      and not exists (select 1 from public.encounters e where e.appointment_id = a.id and e.status = 'FINALIZED')
  )
);
create policy encounter_storage_rollback on storage.objects for delete to authenticated using (
  bucket_id = 'encounter-attachments' and owner_id = auth.uid()::text
);

create table public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict,
  professional_id uuid not null references auth.users(id) on delete restrict,
  body text not null check (char_length(trim(body)) between 1 and 10000),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger prescriptions_set_updated_at before update on public.prescriptions
  for each row execute procedure public.set_updated_at();
alter table public.prescriptions enable row level security;
create policy prescriptions_read on public.prescriptions for select to authenticated using (
  public.is_org_member(organization_id) and (professional_id = auth.uid() or public.has_org_role(organization_id, array['ADMIN']::public.membership_role[]))
);
create policy prescriptions_insert on public.prescriptions for insert to authenticated with check (
  public.is_org_member(organization_id) and professional_id = auth.uid() and exists (
    select 1 from public.appointments a where a.id = appointment_id and a.organization_id = prescriptions.organization_id
      and a.patient_id = prescriptions.patient_id and a.professional_id = auth.uid()
      and a.status in ('CHECKED_IN', 'IN_PROGRESS', 'COMPLETED')
      and not exists (select 1 from public.encounters e where e.appointment_id = a.id and e.status = 'FINALIZED')
  )
);
create policy prescriptions_update on public.prescriptions for update to authenticated using (
  public.is_org_member(organization_id) and professional_id = auth.uid()
) with check (
  public.is_org_member(organization_id) and professional_id = auth.uid() and exists (
    select 1 from public.appointments a where a.id = appointment_id and a.organization_id = prescriptions.organization_id
      and a.patient_id = prescriptions.patient_id and a.professional_id = auth.uid()
      and not exists (select 1 from public.encounters e where e.appointment_id = a.id and e.status = 'FINALIZED')
  )
);
grant select, insert on public.prescriptions to authenticated;
grant update (body, version) on public.prescriptions to authenticated;
