-- 1. Create Audit Log Table
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  action text not null, -- 'UPDATE', 'DELETE'
  old_data jsonb,
  new_data jsonb,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

-- RLS for audit log (read-only for planners/supervisors)
alter table audit_log enable row level security;
create policy "Planners can view audit logs" on audit_log
  for select to authenticated using (
    fn_my_role() in ('planner', 'supervisor')
  );

-- 2. Audit Trigger Function
create or replace function fn_audit_trigger()
returns trigger as $$
begin
  if (TG_OP = 'UPDATE') then
    insert into audit_log (table_name, record_id, action, old_data, new_data, changed_by)
    values (TG_TABLE_NAME, OLD.id, 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, auth.uid());
    return NEW;
  elsif (TG_OP = 'DELETE') then
    insert into audit_log (table_name, record_id, action, old_data, changed_by)
    values (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD)::jsonb, auth.uid());
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- Attach audit trigger to critical tables
create trigger tr_audit_runs
  after update or delete on runs
  for each row execute function fn_audit_trigger();

create trigger tr_audit_cylinders
  after update or delete on cylinders
  for each row execute function fn_audit_trigger();


-- 3. Run Locking
alter table runs add column is_locked boolean not null default false;

create or replace function fn_check_run_lock()
returns trigger as $$
begin
  -- Prevent modification if run is locked
  if (TG_OP = 'UPDATE' or TG_OP = 'DELETE') then
    if (OLD.is_locked = true) then
      -- Allow system or supervisor to unlock, but nothing else while locked
      if (TG_OP = 'UPDATE' and NEW.is_locked = false) then
        return NEW;
      end if;
      raise exception 'Run is locked and cannot be modified.';
    end if;
  end if;
  
  if (TG_OP = 'INSERT') then
    if (NEW.is_locked = true) then
      raise exception 'Cannot insert a locked run.';
    end if;
  end if;

  return coalesce(NEW, OLD);
end;
$$ language plpgsql;

create trigger tr_check_run_lock
  before insert or update or delete on runs
  for each row execute function fn_check_run_lock();

-- Also protect run_stations
create or replace function fn_check_run_station_lock()
returns trigger as $$
declare
  v_is_locked boolean;
begin
  select is_locked into v_is_locked from runs where id = coalesce(NEW.run_id, OLD.run_id);
  if (v_is_locked = true) then
    raise exception 'Parent run is locked. Cannot modify run_stations.';
  end if;
  return coalesce(NEW, OLD);
end;
$$ language plpgsql;

create trigger tr_check_run_station_lock
  before insert or update or delete on run_stations
  for each row execute function fn_check_run_station_lock();
