-- B-1 (#145) : écriture des personnes (PLAN §5, §5.1).
-- Codes d'erreur (SQLSTATE) miroirs de packages/domain/src/errors :
--   HT001 reason_required · HT002 forbidden · HT003 invalid_employee
--   HT004 last_admin · HT005 self_deactivation

-- Les changements de personnes passent par le même journal que les services (A10).
create trigger audit_row_change after insert or update or delete on public.employees
  for each row execute function public.audit_row_change();

-- Crée (p_id nul) ou modifie une personne. Réservé à l'admin.
-- Le lien avec le compte (user_id) et l'état actif ne passent pas par ici.
create function public.save_employee(
  p_id uuid,
  p_display_name text,
  p_department public.department,
  p_role public.app_role,
  p_contract text,
  p_soll_min_day smallint,
  p_soll_min_month integer,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_name text := btrim(p_display_name);
  v_current public.employees;
begin
  if public.current_app_role() is distinct from 'admin' then
    raise exception 'forbidden' using errcode = 'HT002';
  end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception 'reason_required' using errcode = 'HT001';
  end if;
  if nullif(v_name, '') is null
     or p_department is null
     or p_role is null
     or p_contract is null or p_contract not in ('VZ', 'TZ')
     or p_soll_min_day is null or p_soll_min_day not between 0 and 1440
     or p_soll_min_month is null or p_soll_min_month < 0 then
    raise exception 'invalid_employee' using errcode = 'HT003';
  end if;

  if p_id is not null then
    select * into v_current from public.employees e where e.id = p_id for update;
    if not found then
      raise exception 'forbidden' using errcode = 'HT002';
    end if;
    -- Retirer le rôle admin au dernier admin actif laisserait l'app sans administrateur.
    if v_current.role = 'admin' and v_current.active and p_role <> 'admin'
       and not exists (
         select 1 from public.employees e
         where e.role = 'admin' and e.active and e.id <> p_id
       ) then
      raise exception 'last_admin' using errcode = 'HT004';
    end if;
  end if;

  perform set_config('app.reason', btrim(p_reason), true);

  if p_id is null then
    insert into public.employees (display_name, department, role, contract, soll_min_day, soll_min_month)
    values (v_name, p_department, p_role, p_contract, p_soll_min_day, p_soll_min_month)
    returning id into v_id;
  else
    update public.employees e
    set display_name = v_name,
        department = p_department,
        role = p_role,
        contract = p_contract,
        soll_min_day = p_soll_min_day,
        soll_min_month = p_soll_min_month
    where e.id = p_id
    returning e.id into v_id;
  end if;

  perform set_config('app.reason', '', true);

  return v_id;
end
$$;

-- Désactive ou réactive une personne sans la supprimer : ses services restent.
create function public.set_employee_active(p_id uuid, p_active boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.employees;
begin
  if public.current_app_role() is distinct from 'admin' then
    raise exception 'forbidden' using errcode = 'HT002';
  end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception 'reason_required' using errcode = 'HT001';
  end if;
  if p_id is null or p_active is null then
    raise exception 'invalid_employee' using errcode = 'HT003';
  end if;

  select * into v_current from public.employees e where e.id = p_id for update;
  if not found then
    raise exception 'forbidden' using errcode = 'HT002';
  end if;

  if not p_active then
    if p_id = public.current_employee_id() then
      raise exception 'self_deactivation' using errcode = 'HT005';
    end if;
    if v_current.role = 'admin' and v_current.active
       and not exists (
         select 1 from public.employees e
         where e.role = 'admin' and e.active and e.id <> p_id
       ) then
      raise exception 'last_admin' using errcode = 'HT004';
    end if;
  end if;

  perform set_config('app.reason', btrim(p_reason), true);
  update public.employees e set active = p_active where e.id = p_id;
  perform set_config('app.reason', '', true);
end
$$;

revoke execute on function public.save_employee(uuid, text, public.department, public.app_role, text, smallint, integer, text) from public, anon;
revoke execute on function public.set_employee_active(uuid, boolean, text) from public, anon;
grant execute on function public.save_employee(uuid, text, public.department, public.app_role, text, smallint, integer, text) to authenticated;
grant execute on function public.set_employee_active(uuid, boolean, text) to authenticated;
