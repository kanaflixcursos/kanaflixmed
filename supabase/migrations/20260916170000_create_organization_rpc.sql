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
  new_organization public.organizations;
  normalized_name text := trim(org_name);
  normalized_slug text := lower(trim(org_slug));
  normalized_display_name text := trim(member_display_name);
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if length(normalized_name) < 2 or length(normalized_name) > 120 then
    raise exception 'INVALID_ORGANIZATION_NAME';
  end if;

  if normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or length(normalized_slug) < 3 or length(normalized_slug) > 64 then
    raise exception 'INVALID_ORGANIZATION_SLUG';
  end if;

  if length(normalized_display_name) < 2 or length(normalized_display_name) > 120 then
    raise exception 'INVALID_MEMBER_NAME';
  end if;

  insert into public.organizations (name, slug)
  values (normalized_name, normalized_slug::citext)
  returning * into new_organization;

  insert into public.memberships (organization_id, user_id, role, status, display_name)
  values (new_organization.id, auth.uid(), 'ADMIN', 'ACTIVE', normalized_display_name);

  return new_organization;
end;
$$;

revoke all on function public.create_organization(text, text, text) from public;
grant execute on function public.create_organization(text, text, text) to authenticated;
