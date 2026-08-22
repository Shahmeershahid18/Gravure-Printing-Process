-- =============================================================================
-- Realtime publication + one column-level privilege fix.
--
-- Two unrelated things ship together only because they are both one-way DDL
-- that has to be applied before the Vercel deploy.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. pin_hash was readable by every signed-in user.
--
-- The RLS policy on `profiles` is `for select ... using (auth.uid() is not
-- null)`, and its comment claims "pin_hash is never exposed: see
-- v_operator_directory". That is not what the policy does. RLS filters rows,
-- not columns: the view hides the column only from code that goes through the
-- view, and anyone holding an operator session can query PostgREST directly
-- and read every operator's hash.
--
-- These are bcrypt over a 4-digit space -- 10,000 candidates -- so a leaked
-- hash is a leaked PIN, and the PIN is the whole attribution trail on the
-- floor. Column privileges are the right tool and compose with RLS.
-- -----------------------------------------------------------------------------

-- The only thing anyone legitimately needs to know about the hash is whether
-- there is one. Materialising that as a column means the privilege fix does
-- not cost the admin screen or the operator picker anything.
alter table public.profiles
  add column if not exists has_pin boolean
  generated always as (pin_hash is not null) stored;

revoke select on public.profiles from authenticated, anon;

grant select (
  id, full_name, employee_no, role,
  default_machine_id, is_active, has_pin, created_at
) on public.profiles to authenticated;

-- `select *` on profiles now fails for a normal caller, which is the point.
-- PostgREST resolves embedded relations column by column, so the existing
-- `profiles(full_name)` embeds are unaffected.

comment on column public.profiles.pin_hash is
  'Operator PIN, bcrypt. Not selectable by authenticated: test it with '
  'fn_verify_operator_pin, set it with fn_set_operator_pin, and read only '
  'its presence through has_pin.';

-- v_operator_directory is security_invoker, so it is evaluated with the
-- caller's column privileges. Reading p.pin_hash inside it would now fail for
-- every operator tablet. Rebuild it on the generated column instead -- keeping
-- security_invoker, because dropping back to a definer view is what leaked the
-- masters to anon in the first place.
create or replace view v_operator_directory
with (security_invoker = on) as
select p.id, p.full_name, p.employee_no, p.default_machine_id,
       p.has_pin,
       m.code as machine_code
from profiles p
left join machines m on m.id = p.default_machine_id
where p.role = 'operator' and p.is_active;

revoke all on v_operator_directory from anon;
grant select on v_operator_directory to authenticated;


-- -----------------------------------------------------------------------------
-- 2. Realtime.
--
-- Postgres Changes enforces RLS per subscriber, so a viewer receives exactly
-- the rows a viewer may already read. Nothing here widens anyone's access.
--
-- REPLICA IDENTITY FULL is required for two reasons: the old row is needed to
-- evaluate RLS on UPDATE and DELETE, and without it a DELETE carries only the
-- primary key, so a client cannot tell which run a deleted station belonged to.
--
-- The list is deliberately not "every table". Each one here changes while
-- somebody is looking at a screen built from it. Reference data -- colours,
-- suppliers, life rules -- changes a few times a year and is not worth a
-- socket.
-- -----------------------------------------------------------------------------

do $$
declare
  t text;
  live_tables text[] := array[
    'runs',            -- shift board, run list, run detail
    'run_stations',    -- the 8 station grid, two operators on one run
    'observations',    -- issues raised mid-run, next-run flags
    'run_substrates',  -- reel changes during a run
    'job_files',       -- status changes while a planner has the list open
    'cylinders',       -- location and condition changes from the store
    'cylinder_events', -- re-engrave and repair, which move the wear figures
    'machines',        -- a machine taken out of service mid-shift
    'artwork_revisions'
  ];
begin
  foreach t in array live_tables loop
    if to_regclass('public.' || t) is null then
      raise notice 'skipping %, table not present', t;
      continue;
    end if;

    execute format('alter table public.%I replica identity full', t);

    -- `alter publication ... add table` is not idempotent; adding twice raises.
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
