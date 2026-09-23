create table public.patient_observations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  author_user_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  created_at timestamptz not null default now()
);

create index patient_observations_patient_created on public.patient_observations (organization_id, patient_id, created_at desc);

alter table public.patient_observations enable row level security;

create policy patient_observations_member_read on public.patient_observations
  for select to authenticated using (public.is_org_member(organization_id));

create policy patient_observations_member_create on public.patient_observations
  for insert to authenticated with check (
    public.is_org_member(organization_id)
    and author_user_id = auth.uid()
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.organization_id = patient_observations.organization_id and p.active
    )
  );

grant select, insert on public.patient_observations to authenticated;
