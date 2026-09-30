-- B-2 (#146) : création et attribution des tâches du ménage (PLAN §5, §5.1).
-- Codes d'erreur (SQLSTATE) miroirs de packages/domain/src/errors :
--   HT001 reason_required · HT002 forbidden · HT006 invalid_room_task
--   HT007 invalid_assignee · HT008 task_done
-- L'audit des room_tasks est déjà assuré par le trigger audit_row_change.

-- Personne assignable : active et du département housekeeping.
create function public.is_assignable_housekeeper(p_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.employees e
    where e.id = p_employee_id and e.active and e.department = 'housekeeping'
  )
$$;

revoke execute on function public.is_assignable_housekeeper(uuid) from public, anon, authenticated;

-- Crée (p_id nul) ou modifie une tâche. Réservé à l'admin.
-- Le statut n'est pas touché ici : il appartient à la personne assignée (set_task_status).
create function public.save_room_task(
  p_id uuid,
  p_date date,
  p_room_id uuid,
  p_task_type public.task_type,
  p_zone text,
  p_assigned_to uuid,
  p_note text,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_zone text := nullif(btrim(p_zone), '');
begin
  if public.current_app_role() is distinct from 'admin' then
    raise exception 'forbidden' using errcode = 'HT002';
  end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception 'reason_required' using errcode = 'HT001';
  end if;

  -- Une chambre ou une zone, pas les deux ni aucune.
  if p_date is null
     or p_task_type is null
     or (p_room_id is null) = (v_zone is null)
     or (p_room_id is not null and not exists (select 1 from public.rooms r where r.id = p_room_id)) then
    raise exception 'invalid_room_task' using errcode = 'HT006';
  end if;
  if p_assigned_to is not null and not public.is_assignable_housekeeper(p_assigned_to) then
    raise exception 'invalid_assignee' using errcode = 'HT007';
  end if;

  if p_id is not null then
    perform 1 from public.room_tasks t where t.id = p_id for update;
    if not found then
      raise exception 'forbidden' using errcode = 'HT002';
    end if;
  end if;

  -- Index unique (date, room_id) : erreur explicite plutôt qu'une violation brute.
  if p_room_id is not null and exists (
    select 1 from public.room_tasks t
    where t.date = p_date and t.room_id = p_room_id and t.id is distinct from p_id
  ) then
    raise exception 'invalid_room_task' using errcode = 'HT006';
  end if;

  perform set_config('app.reason', btrim(p_reason), true);

  if p_id is null then
    insert into public.room_tasks (date, room_id, task_type, zone, assigned_to, note)
    values (p_date, p_room_id, p_task_type, v_zone, p_assigned_to, p_note)
    returning id into v_id;
  else
    update public.room_tasks t
    set date = p_date,
        room_id = p_room_id,
        task_type = p_task_type,
        zone = v_zone,
        assigned_to = p_assigned_to,
        note = p_note
    where t.id = p_id
    returning t.id into v_id;
  end if;

  perform set_config('app.reason', '', true);

  return v_id;
end
$$;

-- Attribue une tâche, ou retire l'attribution si p_employee_id est nul.
create function public.assign_room_task(p_id uuid, p_employee_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.current_app_role() is distinct from 'admin' then
    raise exception 'forbidden' using errcode = 'HT002';
  end if;
  if p_employee_id is not null and not public.is_assignable_housekeeper(p_employee_id) then
    raise exception 'invalid_assignee' using errcode = 'HT007';
  end if;

  update public.room_tasks t set assigned_to = p_employee_id where t.id = p_id;
  if not found then
    raise exception 'forbidden' using errcode = 'HT002';
  end if;
end
$$;

create function public.delete_room_task(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.task_status;
begin
  if public.current_app_role() is distinct from 'admin' then
    raise exception 'forbidden' using errcode = 'HT002';
  end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception 'reason_required' using errcode = 'HT001';
  end if;

  select t.status into v_status from public.room_tasks t where t.id = p_id for update;
  if not found then
    raise exception 'forbidden' using errcode = 'HT002';
  end if;
  if v_status = 'erledigt' then
    raise exception 'task_done' using errcode = 'HT008';
  end if;

  perform set_config('app.reason', btrim(p_reason), true);
  delete from public.room_tasks where id = p_id;
  perform set_config('app.reason', '', true);
end
$$;

revoke execute on function public.save_room_task(uuid, date, uuid, public.task_type, text, uuid, text, text) from public, anon;
revoke execute on function public.assign_room_task(uuid, uuid) from public, anon;
revoke execute on function public.delete_room_task(uuid, text) from public, anon;
grant execute on function public.save_room_task(uuid, date, uuid, public.task_type, text, uuid, text, text) to authenticated;
grant execute on function public.assign_room_task(uuid, uuid) to authenticated;
grant execute on function public.delete_room_task(uuid, text) to authenticated;
