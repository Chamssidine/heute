-- Helpers de la matrice d'accès (PLAN §5.1). SECURITY DEFINER : la lecture de
-- employees ne doit pas dépendre des policies qui appelleront ces fonctions.
-- Un employé inactif ou absent donne null, donc aucun accès.

create function public.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.id
  from public.employees e
  where e.user_id = auth.uid() and e.active
$$;

create function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select e.role
  from public.employees e
  where e.user_id = auth.uid() and e.active
$$;

revoke execute on function public.current_employee_id() from public, anon;
revoke execute on function public.current_app_role() from public, anon;
grant execute on function public.current_employee_id() to authenticated;
grant execute on function public.current_app_role() to authenticated;
