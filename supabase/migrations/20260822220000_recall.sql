create or replace view v_run_summary as
select 
  r.id,
  r.job_file_id,
  r.machine_id,
  r.run_no,
  r.run_date,
  r.status,
  r.result,
  r.avg_speed_mpm,
  r.waste_pct_m,
  r.waste_pct_kg,
  m.code as machine_code,
  (
    select sum(rs.meters_run)
    from run_stations rs
    where rs.run_id = r.id
  ) as total_meters_run
from runs r
join machines m on m.id = r.machine_id
where r.deleted_at is null;

create or replace view v_cylinder_run_history as
select 
  rs.cylinder_id,
  r.job_file_id,
  r.id as run_id,
  r.run_no,
  r.run_date,
  jf.job_file_no,
  jf.job_no,
  m.code as machine_code,
  rs.meters_run as this_run_meters,
  rs.observation,
  -- Calculate cumulative meters up to this run, including opening_meters
  c.opening_meters + coalesce(
    sum(rs.meters_run) over (
      partition by rs.cylinder_id 
      order by r.run_date asc, r.created_at asc
    ), 0
  ) as cumulative_meters
from run_stations rs
join runs r on r.id = rs.run_id
join job_files jf on jf.id = r.job_file_id
join machines m on m.id = r.machine_id
join cylinders c on c.id = rs.cylinder_id
where r.deleted_at is null;
