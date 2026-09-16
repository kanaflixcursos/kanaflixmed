create extension if not exists pgcrypto;
create extension if not exists citext;
create extension if not exists pg_trgm;

create type public.membership_role as enum ('ADMIN', 'PROFESSIONAL', 'RECEPTION', 'FINANCE');
create type public.membership_status as enum ('INVITED', 'ACTIVE', 'SUSPENDED');
create type public.appointment_status as enum ('SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED');
create type public.encounter_status as enum ('DRAFT', 'FINALIZED');
create type public.financial_entry_type as enum ('RECEIVABLE', 'PAYABLE');
create type public.financial_entry_status as enum ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED');
create type public.payment_method as enum ('CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD', 'TRANSFER', 'OTHER');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug citext not null unique,
  brand_color varchar(7) not null default '#FE6731' check (brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  timezone text not null default 'America/Sao_Paulo',
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'SUSPENDED')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.membership_role not null default 'RECEPTION',
  status public.membership_status not null default 'INVITED',
  display_name text,
  professional_title text,
  council_type text,
  council_number text,
  council_state text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, user_id)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  duration_minutes integer not null default 30 check (duration_minutes > 0 and duration_minutes <= 1440),
  price_cents bigint not null default 0 check (price_cents >= 0),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  record_number bigint generated always as identity,
  display_name text not null,
  legal_name text,
  birth_date date,
  phone_e164 text,
  email citext,
  cpf_hash text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index patients_organization_name_trgm on public.patients using gin (display_name gin_trgm_ops);
create index patients_organization_phone on public.patients (organization_id, phone_e164);
create unique index patients_organization_cpf_hash on public.patients (organization_id, cpf_hash) where cpf_hash is not null;

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  professional_id uuid not null references auth.users(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'SCHEDULED',
  operational_note text,
  price_cents bigint not null default 0 check (price_cents >= 0),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (ends_at > starts_at)
);

create index appointments_org_start on public.appointments (organization_id, starts_at);
create index appointments_org_patient on public.appointments (organization_id, patient_id, starts_at desc);
create index appointments_org_professional on public.appointments (organization_id, professional_id, starts_at);

create table public.appointment_status_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  from_status public.appointment_status,
  to_status public.appointment_status not null,
  reason text,
  actor_user_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default timezone('utc', now())
);

create table public.encounters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  appointment_id uuid unique references public.appointments(id) on delete set null,
  patient_id uuid not null references public.patients(id) on delete restrict,
  professional_id uuid not null references auth.users(id) on delete restrict,
  status public.encounter_status not null default 'DRAFT',
  chief_complaint text,
  history text,
  medical_history text,
  allergies text,
  physical_exam text,
  assessment text,
  plan text,
  additional_notes text,
  version integer not null default 1 check (version > 0),
  started_at timestamptz not null default timezone('utc', now()),
  finalized_at timestamptz,
  finalized_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check ((status = 'DRAFT' and finalized_at is null) or (status = 'FINALIZED' and finalized_at is not null))
);

create index encounters_org_patient on public.encounters (organization_id, patient_id, created_at desc);

create table public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  patient_id uuid references public.patients(id) on delete set null,
  type public.financial_entry_type not null,
  status public.financial_entry_status not null default 'PENDING',
  description text not null,
  amount_cents bigint not null check (amount_cents > 0),
  due_date date not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index financial_entries_appointment_income on public.financial_entries (appointment_id) where appointment_id is not null and type = 'RECEIVABLE' and status <> 'CANCELLED';
create index financial_entries_org_due on public.financial_entries (organization_id, due_date desc);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  financial_entry_id uuid not null references public.financial_entries(id) on delete restrict,
  amount_cents bigint not null check (amount_cents > 0),
  method public.payment_method not null,
  paid_at timestamptz not null default timezone('utc', now()),
  idempotency_key text not null,
  recorded_by uuid references auth.users(id) on delete set null,
  reversed_payment_id uuid references public.payments(id) on delete set null,
  reversal_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, idempotency_key)
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  result text not null default 'SUCCESS' check (result in ('SUCCESS', 'DENIED', 'FAILED')),
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default timezone('utc', now())
);

create trigger organizations_set_updated_at before update on public.organizations for each row execute procedure public.set_updated_at();
create trigger memberships_set_updated_at before update on public.memberships for each row execute procedure public.set_updated_at();
create trigger services_set_updated_at before update on public.services for each row execute procedure public.set_updated_at();
create trigger patients_set_updated_at before update on public.patients for each row execute procedure public.set_updated_at();
create trigger appointments_set_updated_at before update on public.appointments for each row execute procedure public.set_updated_at();
create trigger encounters_set_updated_at before update on public.encounters for each row execute procedure public.set_updated_at();
create trigger financial_entries_set_updated_at before update on public.financial_entries for each row execute procedure public.set_updated_at();

create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and m.status = 'ACTIVE'
  );
$$;

create or replace function public.has_org_role(target_org uuid, allowed_roles public.membership_role[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and m.status = 'ACTIVE'
      and m.role = any(allowed_roles)
  );
$$;

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.services enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_status_events enable row level security;
alter table public.encounters enable row level security;
alter table public.financial_entries enable row level security;
alter table public.payments enable row level security;
alter table public.audit_events enable row level security;

create policy organizations_select on public.organizations for select using (public.is_org_member(id));
create policy organizations_update on public.organizations for update using (public.has_org_role(id, array['ADMIN']::public.membership_role[]));

create policy memberships_select on public.memberships for select using (user_id = auth.uid() or public.has_org_role(organization_id, array['ADMIN']::public.membership_role[]));
create policy memberships_insert on public.memberships for insert with check (public.has_org_role(organization_id, array['ADMIN']::public.membership_role[]));
create policy memberships_update on public.memberships for update using (public.has_org_role(organization_id, array['ADMIN']::public.membership_role[]));

create policy services_member_access on public.services for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy patients_member_access on public.patients for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy appointments_member_access on public.appointments for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy appointment_events_member_access on public.appointment_status_events for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy encounters_professional_access on public.encounters for select using (public.is_org_member(organization_id) and (professional_id = auth.uid() or public.has_org_role(organization_id, array['ADMIN']::public.membership_role[])));
create policy encounters_professional_write on public.encounters for insert with check (public.is_org_member(organization_id) and professional_id = auth.uid());
create policy encounters_professional_update on public.encounters for update using (public.is_org_member(organization_id) and professional_id = auth.uid() and status = 'DRAFT') with check (public.is_org_member(organization_id) and professional_id = auth.uid());
create policy financial_member_access on public.financial_entries for all using (public.has_org_role(organization_id, array['ADMIN', 'RECEPTION', 'FINANCE']::public.membership_role[])) with check (public.has_org_role(organization_id, array['ADMIN', 'RECEPTION', 'FINANCE']::public.membership_role[]));
create policy payments_member_access on public.payments for all using (public.has_org_role(organization_id, array['ADMIN', 'RECEPTION', 'FINANCE']::public.membership_role[])) with check (public.has_org_role(organization_id, array['ADMIN', 'RECEPTION', 'FINANCE']::public.membership_role[]));
create policy audit_admin_access on public.audit_events for select using (public.has_org_role(organization_id, array['ADMIN']::public.membership_role[]));
create policy audit_member_insert on public.audit_events for insert with check (organization_id is null or public.is_org_member(organization_id));

grant usage on schema public to authenticated;
grant select, insert, update on public.organizations, public.memberships, public.services, public.patients, public.appointments, public.appointment_status_events, public.encounters, public.financial_entries, public.payments, public.audit_events to authenticated;
