create or replace function public.create_organization(
  org_name text,
  org_slug text,
  member_display_name text
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  created_organization public.organizations;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  if length(trim(org_name)) < 2 then
    raise exception 'INVALID_ORGANIZATION_NAME' using errcode = 'P0001';
  end if;

  if trim(org_slug) !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'INVALID_ORGANIZATION_SLUG' using errcode = 'P0001';
  end if;

  if length(trim(member_display_name)) < 2 then
    raise exception 'INVALID_MEMBER_NAME' using errcode = 'P0001';
  end if;

  insert into public.organizations (name, slug)
  values (trim(org_name), lower(trim(org_slug)))
  returning * into created_organization;

  insert into public.memberships (organization_id, user_id, role, status, display_name)
  values (created_organization.id, current_user_id, 'ADMIN', 'ACTIVE', trim(member_display_name));

  insert into public.services (organization_id, name, duration_minutes, price_cents)
  values (created_organization.id, 'Consulta', 30, 0);

  return created_organization;
exception
  when unique_violation then
    raise exception 'ORGANIZATION_SLUG_TAKEN' using errcode = 'P0001';
end;
$$;

revoke all on function public.create_organization(text, text, text) from public;
grant execute on function public.create_organization(text, text, text) to authenticated;
