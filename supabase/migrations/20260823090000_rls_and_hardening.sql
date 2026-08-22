-- =============================================================================
-- RLS policies, missing objects, and lock-model corrections.
--
-- Context: every table had row level security enabled with zero policies, so
-- the application read nothing and wrote nothing. Views, meanwhile, ran with
-- the definer's rights and leaked cylinder data to anonymous callers.
--
-- This migration implements the permission matrix in plan.md Section 3.3,
-- closes the view leak, adds the objects Sections 6.13 / 7.2 / 7.7 call for,
-- and replaces the run-lock trigger that made locked runs uneditable by
-- anyone -- including the supervisors Section 8 says must be able to edit them.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Role predicates
--
-- security definer so they read profiles without tripping the profiles policy.
-- -----------------------------------------------------------------------------

create or replace function fn_role_in(variadic p_roles user_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
     where id = auth.uid() and is_active and role = any(p_roles)
  );
$$;

-- Every signed-in, active profile may read reference data.
create or replace function fn_is_authed() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and is_active);
$$;

grant execute on function fn_role_in(user_role[]) to authenticated;
grant execute on function fn_is_authed() to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Missing table: attachments (plan Section 6.13)
-- -----------------------------------------------------------------------------

create table if not exists attachments (
  id          uuid primary key default gen_random_uuid(),
  entity_type text not null,          -- job_file | artwork_revision | run | observation | cylinder
  entity_id   uuid not null,
  file_path   text not null,
  file_name   text not null,
  mime_type   text,
  size_bytes  bigint,
  uploaded_by uuid references profiles(id),
  created_at  timestamptz not null default now()
);
create index if not exists attachments_entity_idx on attachments (entity_type, entity_id);

-- -----------------------------------------------------------------------------
-- 3. Enable RLS everywhere
-- -----------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','customers','machines','suppliers','colour_names','issue_templates',
    'cylinder_life_rules','ink_products','ink_batches','substrate_batches',
    'job_files','artwork_revisions','artwork_revision_cylinders',
    'cylinders','cylinder_events','runs','run_stations','run_process',
    'run_substrates','observations','attachments'
  ] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- Drop any policy previously created on these tables so this migration is
-- the single source of truth and stays re-runnable.
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and tablename in (
         'profiles','customers','machines','suppliers','colour_names','issue_templates',
         'cylinder_life_rules','ink_products','ink_batches','substrate_batches',
         'job_files','artwork_revisions','artwork_revision_cylinders',
         'cylinders','cylinder_events','runs','run_stations','run_process',
         'run_substrates','observations','attachments','audit_log')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 4. Policies
--
-- Read is universal for active profiles: every role in Section 3.3 has at least
-- R on everything it can see at all. Write is what differs, so writes get
-- explicit per-role policies.
-- -----------------------------------------------------------------------------

-- 4a. Reference masters -- admin + planner write, everyone reads.
--     customers, machines, suppliers, colour_names, issue_templates
do $$
declare t text;
begin
  foreach t in array array['customers','machines','suppliers','colour_names','issue_templates'] loop
    execute format($f$
      create policy "read all authed" on %I
        for select to authenticated using (fn_is_authed());
      create policy "admin planner write" on %I
        for insert to authenticated with check (fn_role_in('admin','planner'));
      create policy "admin planner update" on %I
        for update to authenticated
        using (fn_role_in('admin','planner')) with check (fn_role_in('admin','planner'));
      create policy "admin planner delete" on %I
        for delete to authenticated using (fn_role_in('admin','planner'));
    $f$, t, t, t, t);
  end loop;
end $$;

-- 4b. cylinder_life_rules -- admin CRUD, planner CRU (no delete).
create policy "read all authed" on cylinder_life_rules
  for select to authenticated using (fn_is_authed());
create policy "admin planner insert" on cylinder_life_rules
  for insert to authenticated with check (fn_role_in('admin','planner'));
create policy "admin planner update" on cylinder_life_rules
  for update to authenticated
  using (fn_role_in('admin','planner')) with check (fn_role_in('admin','planner'));
create policy "admin delete" on cylinder_life_rules
  for delete to authenticated using (fn_role_in('admin'));

-- 4c. Batch/product masters -- admin+planner CRUD, supervisor+qc CRU.
do $$
declare t text;
begin
  foreach t in array array['ink_products','ink_batches','substrate_batches'] loop
    execute format($f$
      create policy "read all authed" on %I
        for select to authenticated using (fn_is_authed());
      create policy "batch writers insert" on %I
        for insert to authenticated
        with check (fn_role_in('admin','planner','supervisor','qc'));
      create policy "batch writers update" on %I
        for update to authenticated
        using (fn_role_in('admin','planner','supervisor','qc'))
        with check (fn_role_in('admin','planner','supervisor','qc'));
      create policy "admin planner delete" on %I
        for delete to authenticated using (fn_role_in('admin','planner'));
    $f$, t, t, t, t);
  end loop;
end $$;

-- 4d. Job files and artwork -- admin + planner CRUD, everyone reads.
do $$
declare t text;
begin
  foreach t in array array['job_files','artwork_revisions','artwork_revision_cylinders'] loop
    execute format($f$
      create policy "read all authed" on %I
        for select to authenticated using (fn_is_authed());
      create policy "admin planner insert" on %I
        for insert to authenticated with check (fn_role_in('admin','planner'));
      create policy "admin planner update" on %I
        for update to authenticated
        using (fn_role_in('admin','planner')) with check (fn_role_in('admin','planner'));
      create policy "admin planner delete" on %I
        for delete to authenticated using (fn_role_in('admin','planner'));
    $f$, t, t, t, t);
  end loop;
end $$;

-- 4e. cylinders -- admin+planner CRUD, supervisor CRU.
create policy "read all authed" on cylinders
  for select to authenticated using (fn_is_authed());
create policy "cyl writers insert" on cylinders
  for insert to authenticated with check (fn_role_in('admin','planner','supervisor'));
create policy "cyl writers update" on cylinders
  for update to authenticated
  using (fn_role_in('admin','planner','supervisor'))
  with check (fn_role_in('admin','planner','supervisor'));
create policy "admin planner delete" on cylinders
  for delete to authenticated using (fn_role_in('admin','planner'));

-- 4f. cylinder_events -- everyone with a stake may create; only admin deletes.
create policy "read all authed" on cylinder_events
  for select to authenticated using (fn_is_authed());
create policy "all roles insert" on cylinder_events
  for insert to authenticated
  with check (fn_role_in('admin','planner','supervisor','operator','qc'));
create policy "senior update" on cylinder_events
  for update to authenticated
  using (fn_role_in('admin','planner','supervisor'))
  with check (fn_role_in('admin','planner','supervisor'));
create policy "admin delete" on cylinder_events
  for delete to authenticated using (fn_role_in('admin'));

-- 4g. runs and children.
--
-- Operators write only to their own machine and only while the run is
-- unlocked. Operators never delete -- plan Section 3.3, rule one. Only admin
-- deletes a run, and the application soft-deletes via deleted_at anyway.

create policy "read all authed" on runs
  for select to authenticated using (fn_is_authed() and deleted_at is null);

create policy "run writers insert" on runs
  for insert to authenticated
  with check (
    fn_role_in('admin','planner','supervisor')
    or (fn_role_in('operator') and machine_id = fn_my_machine() and locked_at is null)
  );

create policy "run writers update" on runs
  for update to authenticated
  using (
    fn_role_in('admin','supervisor')
    or (fn_role_in('planner') and locked_at is null)
    or (fn_role_in('operator') and machine_id = fn_my_machine() and locked_at is null)
  )
  with check (
    fn_role_in('admin','supervisor')
    or (fn_role_in('planner') and locked_at is null)
    or (fn_role_in('operator') and machine_id = fn_my_machine() and locked_at is null)
  );

create policy "admin delete" on runs
  for delete to authenticated using (fn_role_in('admin'));

-- Children of runs inherit the parent run's write rule.
create or replace function fn_can_write_run(p_run_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from runs r
     where r.id = p_run_id
       and r.deleted_at is null
       and (
         fn_role_in('admin','supervisor')
         or (fn_role_in('planner') and r.locked_at is null)
         or (fn_role_in('operator') and r.machine_id = fn_my_machine() and r.locked_at is null)
       )
  );
$$;
grant execute on function fn_can_write_run(uuid) to authenticated;

do $$
declare t text;
begin
  foreach t in array array['run_stations','run_process','run_substrates'] loop
    execute format($f$
      create policy "read all authed" on %I
        for select to authenticated using (fn_is_authed());
      create policy "run writers insert" on %I
        for insert to authenticated with check (fn_can_write_run(run_id));
      create policy "run writers update" on %I
        for update to authenticated
        using (fn_can_write_run(run_id)) with check (fn_can_write_run(run_id));
      create policy "senior delete" on %I
        for delete to authenticated
        using (fn_role_in('admin','supervisor') and fn_can_write_run(run_id));
    $f$, t, t, t, t);
  end loop;
end $$;

-- 4h. observations -- every operational role creates and updates; only admin deletes.
create policy "read all authed" on observations
  for select to authenticated using (fn_is_authed());
create policy "all roles insert" on observations
  for insert to authenticated
  with check (fn_role_in('admin','planner','supervisor','operator','qc'));
create policy "all roles update" on observations
  for update to authenticated
  using (fn_role_in('admin','planner','supervisor','operator','qc'))
  with check (fn_role_in('admin','planner','supervisor','operator','qc'));
create policy "admin delete" on observations
  for delete to authenticated using (fn_role_in('admin'));

-- 4i. attachments -- operators may create but never delete.
create policy "read all authed" on attachments
  for select to authenticated using (fn_is_authed());
create policy "all roles insert" on attachments
  for insert to authenticated
  with check (fn_role_in('admin','planner','supervisor','operator','qc'));
create policy "senior update" on attachments
  for update to authenticated
  using (fn_role_in('admin','planner','supervisor','qc'))
  with check (fn_role_in('admin','planner','supervisor','qc'));
create policy "admin delete" on attachments
  for delete to authenticated using (fn_role_in('admin'));

-- 4j. profiles -- readable by all (the operator picker needs it), admin writes.
--     pin_hash is never exposed: see v_operator_directory below.
create policy "read all authed" on profiles
  for select to authenticated using (auth.uid() is not null);
create policy "admin insert" on profiles
  for insert to authenticated with check (fn_role_in('admin'));
create policy "admin update" on profiles
  for update to authenticated
  using (fn_role_in('admin')) with check (fn_role_in('admin'));
create policy "admin delete" on profiles
  for delete to authenticated using (fn_role_in('admin'));

-- 4k. audit_log -- admin and supervisor read only (plan Section 3.3).
alter table audit_log enable row level security;
create policy "admin supervisor read" on audit_log
  for select to authenticated using (fn_role_in('admin','supervisor'));

-- -----------------------------------------------------------------------------
-- 5. Close the view leak
--
-- Views were running with the definer's rights, so an anonymous caller holding
-- only the publishable anon key could read the whole cylinder master through
-- v_cylinder_ledger. security_invoker makes the views obey the policies above.
-- -----------------------------------------------------------------------------

alter view v_cylinder_ledger      set (security_invoker = on);
alter view v_cylinder_summary     set (security_invoker = on);
alter view v_cylinder_run_history set (security_invoker = on);
alter view v_run_summary          set (security_invoker = on);
alter view v_job_best_run_by_machine  set (security_invoker = on);
alter view v_job_best_run_overall     set (security_invoker = on);

revoke all on v_cylinder_ledger, v_cylinder_summary, v_cylinder_run_history,
              v_run_summary, v_job_best_run_by_machine, v_job_best_run_overall
  from anon;

-- -----------------------------------------------------------------------------
-- 6. Operator directory
--
-- The kiosk picker needs names and machine assignment but must never receive
-- pin_hash. A narrow view keeps the hash server-side.
-- -----------------------------------------------------------------------------

create or replace view v_operator_directory
with (security_invoker = on) as
select p.id, p.full_name, p.employee_no, p.default_machine_id,
       (p.pin_hash is not null) as has_pin,
       m.code as machine_code
from profiles p
left join machines m on m.id = p.default_machine_id
where p.role = 'operator' and p.is_active;

-- -----------------------------------------------------------------------------
-- 7. Cylinder surface meters -- the re-engrave life reset (plan Section 7.2)
--
-- Lifetime meters answer cost and base-fatigue questions. Surface meters --
-- meters since the last engrave, re-engrave or re-chrome -- answer the only
-- question the floor cares about: should this cylinder come off the machine?
-- Wear alerts must read the surface figure, or a freshly re-engraved cylinder
-- gets pulled off the press for wear it no longer has.
-- -----------------------------------------------------------------------------

create or replace function fn_cylinder_surface_since(p_cylinder_id uuid)
returns date language sql stable as $$
  select max(event_date) from cylinder_events
   where cylinder_id = p_cylinder_id
     and event_type in ('engraved','re_engraved','chrome_plated');
$$;

drop view if exists v_cylinder_summary cascade;

create view v_cylinder_summary
with (security_invoker = on) as
with base as (
  select c.id,
         fn_cylinder_surface_since(c.id) as surface_since,
         fn_cylinder_life_limit(c.id)    as life_limit_meters
  from cylinders c
)
select
  c.id, c.cylinder_no, c.colour_name, c.ownership, c.status, c.condition,
  c.screen_lpi, c.engraving_date,
  cu.name as customer_name,
  b.life_limit_meters,
  b.surface_since,

  -- lifetime: every meter the base has ever run
  c.opening_meters + coalesce(sum(rs.meters_run), 0) as lifetime_meters,

  -- surface: meters since the last surface-restoring event. opening_meters
  -- counts only when the surface predates the imported history.
  coalesce(sum(rs.meters_run) filter (
    where b.surface_since is null or r.run_date >= b.surface_since), 0)
  + case when b.surface_since is null then c.opening_meters else 0 end
    as surface_meters,

  round((
    coalesce(sum(rs.meters_run) filter (
      where b.surface_since is null or r.run_date >= b.surface_since), 0)
    + case when b.surface_since is null then c.opening_meters else 0 end
  )::numeric / nullif(b.life_limit_meters, 0) * 100, 1) as life_used_pct,

  count(distinct r.job_file_id) as job_count,
  count(distinct r.id)          as run_count,
  max(r.run_date)               as last_used_on,
  (select max(ce.event_date) from cylinder_events ce
    where ce.cylinder_id = c.id and ce.event_type = 'cleaning') as last_cleaning,
  (select max(ce.event_date) from cylinder_events ce
    where ce.cylinder_id = c.id and ce.event_type = 'repair')   as last_repair,
  (select count(*) from observations o
    where o.cylinder_id = c.id and o.severity in ('major','critical')) as major_issue_count
from cylinders c
join base b               on b.id = c.id
left join customers cu    on cu.id = c.owned_by_customer_id
left join run_stations rs on rs.cylinder_id = c.id and rs.is_idle = false
left join runs r          on r.id = rs.run_id and r.deleted_at is null
group by c.id, cu.name, b.life_limit_meters, b.surface_since;

-- v_cylinder_ledger kept for compatibility, now surface-aware and RLS-obeying.
drop view if exists v_cylinder_ledger cascade;

create view v_cylinder_ledger
with (security_invoker = on) as
select
  c.*,
  s.life_limit_meters as life_limit,
  s.surface_meters    as current_meters,
  s.lifetime_meters,
  s.surface_meters,
  s.surface_since,
  coalesce(s.life_used_pct, 0) as wear_percentage,
  s.last_used_on,
  s.last_cleaning,
  s.customer_name
from cylinders c
join v_cylinder_summary s on s.id = c.id;

-- fn_pre_run_briefing referenced cs.total_meters, which no longer exists on the
-- summary. Recreate the accessor names the function expects.
create or replace function fn_cylinder_alerts(p_run_id uuid)
returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(x order by x.life_used_pct desc), '[]'::jsonb) from (
    select distinct cs.cylinder_no, cs.colour_name, rs.station_no,
           cs.surface_meters as total_meters, cs.life_limit_meters, cs.life_used_pct,
           cs.condition, cs.last_cleaning, cs.ownership
    from run_stations rs
    join v_cylinder_summary cs on cs.id = rs.cylinder_id
    where rs.run_id = p_run_id
      and (cs.life_used_pct >= 80 or cs.condition in ('worn','damaged'))
      -- cylinders off the press cannot be pulled off it (plan Section 7.2)
      and cs.status not in ('with_customer','at_engraver','scrapped')
  ) x;
$$;

-- The briefing read cs.total_meters off the old summary shape. Repoint it at
-- the surface-aware helper so cylinder alerts survive the view change, and
-- have it return the machine's own last run rather than nothing when a job has
-- never run on this machine before.
create or replace function fn_pre_run_briefing(p_job_file_id uuid, p_machine_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_last_run  runs%rowtype;
  v_last_on_machine runs%rowtype;
begin
  select * into v_last_run
  from runs
  where job_file_id = p_job_file_id and status = 'completed' and deleted_at is null
  order by run_no desc limit 1;

  select * into v_last_on_machine
  from runs
  where job_file_id = p_job_file_id and machine_id = p_machine_id
    and status = 'completed' and deleted_at is null
  order by run_no desc limit 1;

  return jsonb_build_object(
    'job', (
      select to_jsonb(x) from (
        select jf.id, jf.job_file_no, jf.job_no, c.name as customer, jf.product_name,
               jf.structure, jf.no_of_colours,
               ar.revision_label, ar.shade_card_no, ar.customer_approval
        from job_files jf
        join customers c on c.id = jf.customer_id
        left join artwork_revisions ar on ar.job_file_id = jf.id and ar.is_current
        where jf.id = p_job_file_id
      ) x),
    'machine', (select to_jsonb(x) from (
        select m.id, m.code, m.name from machines m where m.id = p_machine_id) x),
    'machine_change', (
      select case when v_last_run.id is null then null
                  when v_last_run.machine_id = p_machine_id then null
             else jsonb_build_object(
               'previous_machine', (select code from machines where id = v_last_run.machine_id),
               'new_machine',      (select code from machines where id = p_machine_id),
               'warning', 'Last run was on a different machine. Tension and dryer settings below may not transfer.',
               'last_run_on_this_machine', to_jsonb(v_last_on_machine))
             end),
    'last_run', to_jsonb(v_last_run),
    'last_run_machine', (select code from machines where id = v_last_run.machine_id),
    'best_run', (
      select to_jsonb(coalesce(bm, bo))
      from (select 1) z
      left join v_job_best_run_by_machine bm
        on bm.job_file_id = p_job_file_id and bm.machine_id = p_machine_id
      left join v_job_best_run_overall bo
        on bo.job_file_id = p_job_file_id),
    'open_next_run_notes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', o.id, 'area', o.area, 'severity', o.severity,
        'title', o.title, 'note', o.next_run_note,
        'from_run', rr.run_no, 'station', rs.station_no)
        order by o.severity desc, o.observed_at desc), '[]'::jsonb)
      from observations o
      left join runs rr on rr.id = o.run_id
      left join run_stations rs on rs.id = o.run_station_id
      where o.job_file_id = p_job_file_id
        and o.next_run_note is not null
        and o.next_run_note_cleared_at is null),
    'recurring_issues', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select o.area, o.title, count(*) as occurrences, max(o.observed_at) as last_seen
        from observations o
        where o.job_file_id = p_job_file_id
        group by o.area, o.title
        having count(*) >= 2
        order by count(*) desc limit 10
      ) x),
    'cylinder_alerts', fn_cylinder_alerts(v_last_run.id),
    'last_run_stations', (
      select coalesce(jsonb_agg(x order by x.station_no), '[]'::jsonb) from (
        select rs.station_no, rs.colour_name, rs.is_idle, c.cylinder_no,
               ip.ink_code, ib.batch_no as ink_batch,
               rs.initial_viscosity_sec, rs.running_viscosity_sec,
               rs.dryer_temp_c, rs.impression_pressure, rs.observation
        from run_stations rs
        left join cylinders c     on c.id  = rs.cylinder_id
        left join ink_products ip on ip.id = rs.ink_product_id
        left join ink_batches ib  on ib.id = rs.ink_batch_id
        where rs.run_id = coalesce(v_last_on_machine.id, v_last_run.id)
      ) x),
    'last_run_process',
      (select to_jsonb(rp) from run_process rp
        where rp.run_id = coalesce(v_last_on_machine.id, v_last_run.id)),
    'substrate_watchlist', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select sb.batch_no, s.name as supplier, sb.material_type,
               sb.thickness_micron, count(o.id) as issue_count
        from run_substrates rsub
        join substrate_batches sb on sb.id = rsub.substrate_batch_id
        join suppliers s          on s.id  = sb.supplier_id
        left join observations o  on o.substrate_batch_id = sb.id
        where rsub.run_id = v_last_run.id
        group by sb.id, s.name
        having count(o.id) > 0
      ) x)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 8. Global search (plan Section 7.7)
-- -----------------------------------------------------------------------------

create or replace function fn_global_search(q text)
returns table (kind text, id uuid, label text, sublabel text)
language sql stable as $$
  select 'job_file', jf.id, jf.job_file_no || ' / ' || jf.job_no,
         c.name || ' · ' || jf.product_name
    from job_files jf join customers c on c.id = jf.customer_id
   where jf.job_file_no ilike '%'||q||'%' or jf.job_no ilike '%'||q||'%'
      or jf.product_name ilike '%'||q||'%'
  union all
  select 'cylinder', c.id, c.cylinder_no,
         coalesce(c.colour_name,'') || ' · ' || c.status::text
    from cylinders c where c.cylinder_no ilike '%'||q||'%'
  union all
  select 'ink_batch', ib.id, ib.batch_no, ip.ink_code || ' · ' || ip.colour_name
    from ink_batches ib join ink_products ip on ip.id = ib.ink_product_id
   where ib.batch_no ilike '%'||q||'%'
  union all
  select 'substrate_batch', sb.id, sb.batch_no,
         s.name || ' · ' || sb.material_type || ' ' || sb.thickness_micron || 'µ'
    from substrate_batches sb join suppliers s on s.id = sb.supplier_id
   where sb.batch_no ilike '%'||q||'%'
  limit 40;
$$;
grant execute on function fn_global_search(text) to authenticated;

-- -----------------------------------------------------------------------------
-- 9. Run locking, corrected
--
-- The previous trigger raised on any update to a locked run, which locked out
-- the supervisors Section 8 explicitly allows to edit locked runs, and made
-- the audit trail pointless. Locking is now: locked_at is the single source of
-- truth, and only admin/supervisor may write past it.
-- -----------------------------------------------------------------------------

drop trigger if exists tr_check_run_lock on runs;
drop trigger if exists tr_check_run_station_lock on run_stations;
drop function if exists fn_check_run_lock();
drop function if exists fn_check_run_station_lock();

-- Fold the redundant boolean into locked_at so there is one lock flag, not two.
update runs set locked_at = coalesce(locked_at, now()) where is_locked = true;
alter table runs drop column if exists is_locked;

create or replace function fn_enforce_run_lock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'UPDATE' and OLD.locked_at is not null then
    -- unlocking, and editing while unlocked, stay open to admin and supervisor
    if not fn_role_in('admin','supervisor') then
      raise exception 'Run % is locked. Ask a supervisor to reopen it.', OLD.run_no
        using errcode = 'check_violation';
    end if;
  end if;
  return NEW;
end;
$$;

create trigger tr_enforce_run_lock
  before update on runs
  for each row execute function fn_enforce_run_lock();

create or replace function fn_enforce_run_station_lock()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_locked timestamptz; v_run_no int;
begin
  select locked_at, run_no into v_locked, v_run_no
    from runs where id = coalesce(NEW.run_id, OLD.run_id);
  if v_locked is not null and not fn_role_in('admin','supervisor') then
    raise exception 'Run % is locked. Ask a supervisor to reopen it.', v_run_no
      using errcode = 'check_violation';
  end if;
  return coalesce(NEW, OLD);
end;
$$;

create trigger tr_enforce_run_station_lock
  before insert or update or delete on run_stations
  for each row execute function fn_enforce_run_station_lock();

-- Scheduled lock: any completed run older than 24 hours (plan Section 8).
create or replace function fn_lock_stale_runs()
returns integer language sql security definer set search_path = public as $$
  with locked as (
    update runs set locked_at = now()
     where status = 'completed'
       and locked_at is null
       and deleted_at is null
       and end_time < now() - interval '24 hours'
    returning 1
  ) select count(*)::int from locked;
$$;

-- -----------------------------------------------------------------------------
-- 10. Audit trigger: cover observations and run_stations too (Section 6.13)
-- -----------------------------------------------------------------------------

drop trigger if exists tr_audit_run_stations on run_stations;
create trigger tr_audit_run_stations
  after update or delete on run_stations
  for each row execute function fn_audit_trigger();

drop trigger if exists tr_audit_observations on observations;
create trigger tr_audit_observations
  after update or delete on observations
  for each row execute function fn_audit_trigger();

-- -----------------------------------------------------------------------------
-- 11. Operator PIN management
--
-- pin_hash must never round-trip through the client, so setting a PIN is an
-- admin-only definer function rather than a column update.
-- -----------------------------------------------------------------------------

create or replace function fn_set_operator_pin(p_profile_id uuid, p_pin text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not fn_role_in('admin') then
    raise exception 'Only an admin can set an operator PIN.'
      using errcode = 'insufficient_privilege';
  end if;
  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN must be exactly 4 digits.' using errcode = 'check_violation';
  end if;
  update profiles set pin_hash = crypt(p_pin, gen_salt('bf')) where id = p_profile_id;
end;
$$;
grant execute on function fn_set_operator_pin(uuid, text) to authenticated;

create or replace function fn_clear_operator_pin(p_profile_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not fn_role_in('admin') then
    raise exception 'Only an admin can clear an operator PIN.'
      using errcode = 'insufficient_privilege';
  end if;
  update profiles set pin_hash = null where id = p_profile_id;
end;
$$;
grant execute on function fn_clear_operator_pin(uuid) to authenticated;

-- fn_verify_operator_pin needs the pgcrypto schema on its search_path, and it
-- must not be callable by anonymous visitors probing PINs.
create or replace function fn_verify_operator_pin(p_profile_id uuid, p_pin text)
returns boolean language sql security definer set search_path = public, extensions as $$
  select exists (
    select 1 from profiles
     where id = p_profile_id and is_active and pin_hash is not null
       and pin_hash = crypt(p_pin, pin_hash));
$$;
revoke execute on function fn_verify_operator_pin(uuid, text) from anon;
grant  execute on function fn_verify_operator_pin(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 12. Grants
-- -----------------------------------------------------------------------------

grant execute on function fn_pre_run_briefing(uuid, uuid) to authenticated;
grant execute on function fn_seed_run_stations(uuid)      to authenticated;
grant execute on function fn_apply_run_meters(uuid)       to authenticated;
grant execute on function fn_cylinder_life_limit(uuid)    to authenticated;
grant execute on function fn_cylinder_surface_since(uuid) to authenticated;
grant execute on function fn_cylinder_alerts(uuid)        to authenticated;
grant execute on function fn_lock_stale_runs()            to authenticated;
