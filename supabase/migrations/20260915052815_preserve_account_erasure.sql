-- Preserve account-erasure cascades while retaining completed assessment history.
create or replace function public.guard_architect_blueprint_history()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.id <> old.id or new.user_id <> old.user_id or (new.assessment_id is distinct from old.assessment_id
    and not (new.assessment_id is null and not exists(select 1 from public.architect_assessments where id = old.assessment_id))) then
    raise exception 'Blueprint identity cannot be changed.' using errcode = '22023';
  end if;
  if exists (select 1 from public.architect_assessments where id = old.assessment_id and status = 'completed')
    and (new.priorities is distinct from old.priorities or new.strengths is distinct from old.strengths
      or new.friction_points is distinct from old.friction_points or new.first_actions is distinct from old.first_actions) then
    raise exception 'A completed Blueprint is saved history. Complete a new assessment to create another.' using errcode = '55000';
  end if;
  return new;
end;
$$;
