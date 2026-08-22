-- =============================================================================
-- Fix: the Pre Run Briefing could not be built.
--
--   COALESCE could not convert type v_job_best_run_overall
--   to v_job_best_run_by_machine
--
-- fn_pre_run_briefing picked the best run with `coalesce(bm, bo)` over two
-- different view row types. Postgres will not coalesce unrelated composite
-- types, so the whole function raised and the briefing -- the one screen the
-- plan calls "the product" -- failed to render on both the kiosk and the
-- desktop.
--
-- This lifts the two rows to jsonb first and chooses between them there, which
-- also makes the preference explicit: the best run on the *same machine* wins,
-- and the overall best is only a fallback. Comparing a run on G-01 to a run on
-- G-02 produces nonsense (plan Section 7.3), so the fallback is labelled in
-- the payload rather than silently substituted.
-- =============================================================================

create or replace function fn_pre_run_briefing(p_job_file_id uuid, p_machine_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_last_run        runs%rowtype;
  v_last_on_machine runs%rowtype;
  v_best            jsonb;
  v_best_same_machine boolean := false;
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

  -- Best run on this machine first.
  select to_jsonb(bm) into v_best
  from v_job_best_run_by_machine bm
  where bm.job_file_id = p_job_file_id and bm.machine_id = p_machine_id;

  if v_best is not null then
    v_best_same_machine := true;
  else
    select to_jsonb(bo) into v_best
    from v_job_best_run_overall bo
    where bo.job_file_id = p_job_file_id;
  end if;

  if v_best is not null then
    v_best := v_best || jsonb_build_object(
      'same_machine', v_best_same_machine,
      'machine_code', (select code from machines
                        where id = (v_best->>'machine_id')::uuid));
  end if;

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
    'best_run', v_best,

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

grant execute on function fn_pre_run_briefing(uuid, uuid) to authenticated;
