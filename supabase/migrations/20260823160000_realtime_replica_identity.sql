-- =============================================================================
-- Drop REPLICA IDENTITY back to DEFAULT on the live tables.
--
-- Optional. Nothing is broken without it; this is a correction to a decision I
-- made in 20260823140000 for a reason that turned out not to be true.
--
-- That migration set REPLICA IDENTITY FULL, arguing the old row was needed to
-- evaluate RLS on UPDATE and DELETE. Measured against the live project, it is
-- not:
--
--   * UPDATE -- Realtime evaluates policies against the NEW record, which is
--     complete regardless of replica identity.
--   * DELETE -- Realtime does not apply RLS to deletes at all, and emits only
--     the replica identity's key columns. Verified: an anonymous subscriber
--     and a viewer both received exactly {"id": "..."} for a deleted run and
--     a deleted cylinder, with FULL in force. No row content is carried
--     either way, so FULL buys nothing here.
--
-- What it costs is real. FULL writes the entire old row into the WAL on every
-- UPDATE. run_stations is updated continuously while a run is on the press --
-- eight rows, several fields each, on an 800ms autosave -- so this is the one
-- table in the schema where WAL volume actually matters.
--
-- The application never reads a change payload. RealtimeRefresh uses the event
-- purely as a signal to re-run the server render, so dropping to DEFAULT
-- changes nothing it can observe.
--
-- Residual exposure, stated plainly rather than left implied: because Realtime
-- does not apply RLS to DELETE, anyone holding the publishable key can learn
-- that a row with a given uuid was deleted from one of these tables. That is
-- activity timing, not content. Closing it entirely means moving off Postgres
-- Changes to Broadcast-from-database with an RLS-guarded topic, which is a
-- larger change than this system currently needs.
-- =============================================================================

do $$
declare
  t text;
  live_tables text[] := array[
    'runs', 'run_stations', 'observations', 'run_substrates',
    'job_files', 'cylinders', 'cylinder_events', 'machines',
    'artwork_revisions'
  ];
begin
  foreach t in array live_tables loop
    if to_regclass('public.' || t) is null then
      raise notice 'skipping %, table not present', t;
      continue;
    end if;
    execute format('alter table public.%I replica identity default', t);
  end loop;
end $$;
