create table runs (
  id                  uuid primary key default gen_random_uuid(),
  job_file_id         uuid not null references job_files(id) on delete cascade,
  artwork_revision_id uuid not null references artwork_revisions(id),
  run_no              int  not null,
  machine_id          uuid not null references machines(id),
  run_date            date not null,
  shift               text,
  operator_id         uuid references profiles(id),
  supervisor_id       uuid references profiles(id),
  start_time          timestamptz,
  end_time            timestamptz,

  planned_qty_m       numeric(12,2),
  planned_qty_kg      numeric(12,3),
  produced_qty_m      numeric(12,2),
  produced_qty_kg     numeric(12,3),
  waste_m             numeric(12,2),
  waste_kg            numeric(12,3),

  waste_pct_m         numeric(6,3) generated always as (
                        case when coalesce(produced_qty_m,0) + coalesce(waste_m,0) > 0
                        then round(coalesce(waste_m,0) / (produced_qty_m + waste_m) * 100, 3)
                        end) stored,
  waste_pct_kg        numeric(6,3) generated always as (
                        case when coalesce(produced_qty_kg,0) + coalesce(waste_kg,0) > 0
                        then round(coalesce(waste_kg,0) / (produced_qty_kg + waste_kg) * 100, 3)
                        end) stored,

  avg_speed_mpm       int,
  max_speed_mpm       int,
  status              run_status not null default 'planned',
  result              run_result,
  remarks             text,
  briefing_ack_by     uuid references profiles(id),
  briefing_ack_at     timestamptz,
  locked_at           timestamptz,
  deleted_at          timestamptz,
  created_by          uuid references profiles(id),
  created_at          timestamptz not null default now(),
  unique (job_file_id, run_no)
);

create index on runs (job_file_id, run_no desc);
create index on runs (run_date desc);
create index on runs (machine_id, run_date desc);
create index on runs (status) where deleted_at is null;

create table run_stations (
  id                    uuid primary key default gen_random_uuid(),
  run_id                uuid not null references runs(id) on delete cascade,
  station_no            int  not null check (station_no between 1 and 8),
  colour_name           text references colour_names(name),
  is_idle               boolean not null default false,
  cylinder_id           uuid references cylinders(id),
  ink_product_id        uuid references ink_products(id),
  ink_batch_id          uuid references ink_batches(id),

  initial_viscosity_sec numeric(6,2),
  running_viscosity_sec numeric(6,2),
  viscosity_cup         text default 'Zahn #2',
  ink_temp_c            numeric(5,2),
  solvent_mix           jsonb,
  solvent_added_kg      numeric(10,3),
  ink_consumed_kg       numeric(10,3),

  doctor_blade_type     text,
  doctor_blade_angle    numeric(5,2),
  impression_pressure   numeric(6,2),
  dryer_temp_c          numeric(6,2),
  dryer_air_flow        numeric(8,2),

  meters_run            numeric(12,2) not null default 0,

  previous_issue_note   text,
  observation           text,
  created_at            timestamptz not null default now(),
  unique (run_id, station_no)
);

create index on run_stations (cylinder_id);
create index on run_stations (ink_batch_id);

create table run_process (
  run_id                uuid primary key references runs(id) on delete cascade,
  unwind_tension_kg     numeric(6,2),
  infeed_tension_kg     numeric(6,2),
  outfeed_tension_kg    numeric(6,2),
  rewind_tension_kg     numeric(6,2),
  chill_roll_temp_c     numeric(5,2),
  main_exhaust_pct      numeric(5,2),
  supply_air_pct        numeric(5,2),
  static_eliminator_on  boolean,
  ink_pump_settings     jsonb,
  registration_mode     text,
  registration_tolerance_micron numeric(6,2),
  ambient_temp_c        numeric(5,2),
  ambient_rh_pct        numeric(5,2),
  solvent_retention_mg_m2 numeric(8,3),
  adhesion_tape_test_pct  numeric(5,2),
  other_settings        jsonb,
  remarks               text
);

create table run_substrates (
  id                 uuid primary key default gen_random_uuid(),
  run_id             uuid not null references runs(id) on delete cascade,
  substrate_batch_id uuid not null references substrate_batches(id),
  roll_no            text,
  meters_used        numeric(12,2),
  kg_used            numeric(12,3),
  dyne_at_machine    numeric(5,2),
  treatment_side     text,
  observation        text,
  result             text
);

-- Observations (Phase 5 schema, needed for Phase 4 views)
create table observations (
  id                 uuid primary key default gen_random_uuid(),
  job_file_id        uuid not null references job_files(id) on delete cascade,
  run_id             uuid references runs(id) on delete cascade,
  run_station_id     uuid references run_stations(id) on delete cascade,

  cylinder_id        uuid references cylinders(id),
  ink_batch_id       uuid references ink_batches(id),
  substrate_batch_id uuid references substrate_batches(id),
  machine_id         uuid references machines(id),

  observed_at        timestamptz not null default now(),
  area               issue_area not null,
  severity           issue_severity not null default 'minor',
  title              text not null,
  description        text not null,
  action_taken       text,
  setting_changed    jsonb,
  result             text,
  is_resolved        boolean not null default false,
  next_run_note      text,
  next_run_note_cleared_at timestamptz,
  next_run_note_cleared_by uuid references profiles(id),
  photo_urls         text[] default '{}',
  reported_by        uuid references profiles(id),
  created_at         timestamptz not null default now()
);

create index on observations (job_file_id, observed_at desc);
create index on observations (cylinder_id)         where cylinder_id is not null;
create index on observations (substrate_batch_id)  where substrate_batch_id is not null;
create index on observations (ink_batch_id)        where ink_batch_id is not null;
create index on observations (area, severity);
create index obs_open_next_notes on observations (job_file_id)
  where next_run_note is not null and next_run_note_cleared_at is null;

-- best run on the same machine (preferred reference)
create or replace view v_job_best_run_by_machine as
select distinct on (job_file_id, machine_id)
  job_file_id, machine_id, id as run_id, run_no, run_date,
  avg_speed_mpm, waste_pct_m, waste_pct_kg
from runs
where status = 'completed' and result = 'ok' and deleted_at is null
  and waste_pct_m is not null
order by job_file_id, machine_id, waste_pct_m asc;

-- best run overall (fallback when this job has never run on this machine)
create or replace view v_job_best_run_overall as
select distinct on (job_file_id)
  job_file_id, machine_id, id as run_id, run_no, run_date,
  avg_speed_mpm, waste_pct_m, waste_pct_kg
from runs
where status = 'completed' and result = 'ok' and deleted_at is null
  and waste_pct_m is not null
order by job_file_id, waste_pct_m asc;

-- Re-create v_cylinder_ledger to include runs
create or replace view v_cylinder_ledger as
select 
  c.*,
  fn_cylinder_life_limit(c.id) as life_limit,
  (c.opening_meters + coalesce((
    select sum(rs.meters_run)
    from run_stations rs
    join runs r on r.id = rs.run_id
    where rs.cylinder_id = c.id
      and r.deleted_at is null
  ), 0)) as current_meters,
  case 
    when fn_cylinder_life_limit(c.id) = 0 then 0
    else ((c.opening_meters + coalesce((
      select sum(rs.meters_run)
      from run_stations rs
      join runs r on r.id = rs.run_id
      where rs.cylinder_id = c.id
        and r.deleted_at is null
    ), 0))::numeric / fn_cylinder_life_limit(c.id)) * 100 
  end as wear_percentage
from cylinders c;

-- Summary for briefing
create or replace view v_cylinder_summary as
select 
  id, cylinder_no, colour_name, condition, ownership,
  fn_cylinder_life_limit(id) as life_limit_meters,
  (select current_meters from v_cylinder_ledger where id = c.id) as total_meters,
  (select wear_percentage from v_cylinder_ledger where id = c.id) as life_used_pct,
  (select max(ce.event_date) from cylinder_events ce where ce.cylinder_id = c.id and ce.event_type = 'cleaning') as last_cleaning
from cylinders c;

create or replace function fn_pre_run_briefing(p_job_file_id uuid, p_machine_id uuid)
returns jsonb
language plpgsql stable
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
        select jf.job_file_no, jf.job_no, c.name as customer, jf.product_name,
               jf.structure, jf.no_of_colours,
               ar.revision_label, ar.shade_card_no, ar.customer_approval
        from job_files jf
        join customers c on c.id = jf.customer_id
        left join artwork_revisions ar on ar.job_file_id = jf.id and ar.is_current
        where jf.id = p_job_file_id
      ) x),
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
    'cylinder_alerts', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select distinct cs.cylinder_no, cs.colour_name, rs.station_no,
               cs.total_meters, cs.life_limit_meters, cs.life_used_pct,
               cs.condition, cs.last_cleaning, cs.ownership
        from run_stations rs
        join v_cylinder_summary cs on cs.id = rs.cylinder_id
        where rs.run_id = v_last_run.id
          and (cs.life_used_pct >= 80 or cs.condition in ('worn','damaged'))
        order by cs.life_used_pct desc
      ) x),
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

create or replace function fn_seed_run_stations(p_run_id uuid)
returns void language plpgsql as $$
declare
  v_run runs%rowtype;
  v_prev_run_id uuid;
begin
  select * into v_run from runs where id = p_run_id;

  select id into v_prev_run_id
  from runs
  where job_file_id = v_run.job_file_id and run_no < v_run.run_no
    and deleted_at is null
  order by run_no desc limit 1;

  if v_prev_run_id is not null then
    insert into run_stations (run_id, station_no, colour_name, is_idle, cylinder_id,
                              ink_product_id, doctor_blade_type, doctor_blade_angle,
                              previous_issue_note)
    select p_run_id, prs.station_no, prs.colour_name, prs.is_idle, prs.cylinder_id,
           prs.ink_product_id, prs.doctor_blade_type, prs.doctor_blade_angle,
           nullif(concat_ws(' | ', prs.observation,
             (select string_agg(o.next_run_note, ' | ')
                from observations o
               where o.run_station_id = prs.id
                 and o.next_run_note is not null
                 and o.next_run_note_cleared_at is null)), '')
    from run_stations prs
    where prs.run_id = v_prev_run_id
    on conflict (run_id, station_no) do nothing;
  end if;

  -- always ensure all 8 rows exist
  insert into run_stations (run_id, station_no, is_idle)
  select p_run_id, gs,
         gs > coalesce((select no_of_colours from job_files where id = v_run.job_file_id), 8)
  from generate_series(1,8) gs
  on conflict (run_id, station_no) do nothing;
end; $$;

create or replace function fn_apply_run_meters(p_run_id uuid)
returns void language sql as $$
  update run_stations rs
     set meters_run = coalesce(r.produced_qty_m,0) + coalesce(r.waste_m,0)
    from runs r
   where r.id = p_run_id and rs.run_id = r.id and rs.is_idle = false;
$$;
