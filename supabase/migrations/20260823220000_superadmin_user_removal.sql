-- =============================================================================
-- Removing a person: suspend, and delete.
--
-- Two operations, because "delete this suspicious user" is almost never the
-- right first move and the console should not make it the easy one.
--
-- A suspicious account is a live incident. What you want in the first minute
-- is for them to stop being able to act -- and for every record of what they
-- did to survive, because that record is the only reason you know they are
-- suspicious. Deleting the account destroys the second thing to achieve the
-- first. So:
--
--   fn_sa_suspend_user   -- reversible, instant, keeps everything. The default.
--   fn_sa_prepare_delete -- irreversible, detaches attribution. Deliberate only.
--
-- Suspension needs no session revocation machinery: the middleware re-reads
-- is_active on every request (utils/supabase/middleware.ts), so a suspended
-- account is signed out on its next navigation even though its JWT is still
-- cryptographically valid.
--
-- Deletion has a constraint the UI cannot hide. Eleven columns across the
-- schema reference profiles(id) with no ON DELETE action -- runs.operator_id,
-- observations.reported_by, audit_log.changed_by and the rest -- so removing
-- the sign-in fails outright while any of them still point at it. They have to
-- be detached first, and detaching them is exactly what destroys "who ran this
-- job". That is the real cost of a hard delete and it is stated in the console
-- rather than discovered afterwards.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Suspend
--
-- Deactivates, clears the operator PIN, and records why. The PIN matters: an
-- operator PIN is checked by fn_verify_operator_pin against `is_active`, so a
-- deactivated account cannot use it -- but leaving a live hash on a suspended
-- account is the kind of thing that outlives the suspension when someone
-- reactivates them six months later without thinking about it.
-- -----------------------------------------------------------------------------

create or replace function fn_sa_suspend_user(
  p_user   uuid,
  p_reason text default null,
  p_on     boolean default true
) returns jsonb
language plpgsql security definer set search_path = public, private as $fn$
declare
  v_name  text;
  v_email text;
begin
  perform fn_sa_guard();

  if p_user = auth.uid() then
    raise exception 'You cannot suspend the account you are signed in with.'
      using errcode = 'P0001';
  end if;

  select p.full_name, u.email into v_name, v_email
    from profiles p left join auth.users u on u.id = p.id
   where p.id = p_user;

  if v_name is null then
    raise exception 'No such account.' using errcode = 'P0001';
  end if;

  if p_on then
    update profiles set is_active = false, pin_hash = null where id = p_user;
  else
    update profiles set is_active = true where id = p_user;
  end if;

  insert into private.activity_log (
    actor_id, actor_hidden, category, event, summary, target_type, target_id, meta)
  values (
    auth.uid(), true, 'admin',
    case when p_on then 'admin.user_suspended' else 'admin.user_restored' end,
    case when p_on
         then format('Suspended %s%s', v_name,
                     case when p_reason is not null then ' — ' || p_reason else '' end)
         else format('Restored %s', v_name) end,
    'profile', p_user::text,
    jsonb_build_object('email', v_email, 'reason', p_reason));

  return jsonb_build_object('ok', true, 'suspended', p_on, 'name', v_name);
end;
$fn$;


-- -----------------------------------------------------------------------------
-- 2. Prepare a permanent deletion
--
-- Everything that can be done in SQL. Removing the sign-in itself cannot be:
-- auth.users is owned by supabase_auth_admin, so this function deliberately
-- does not try to write to it. The caller finishes the job through the Admin
-- API with the service role key, which is the supported path and the same one
-- lib/actions/users.ts already uses to create a sign-in.
--
-- Ordering is chosen so a failure leaves a safe state rather than a half-open
-- one: the account is deactivated and its PIN cleared *first*, so if the Admin
-- API call afterwards fails, what remains is a suspended account with detached
-- history -- not a live account whose trail has been wiped.
-- -----------------------------------------------------------------------------

create or replace function fn_sa_prepare_delete(p_user uuid)
returns jsonb
language plpgsql security definer set search_path = public, private as $fn$
declare
  v_name    text;
  v_email   text;
  v_role    text;
  v_counts  jsonb := '{}'::jsonb;
  n         bigint;
begin
  perform fn_sa_guard();

  if p_user = auth.uid() then
    raise exception 'You cannot delete the account you are signed in with.'
      using errcode = 'P0001';
  end if;

  if fn_is_hidden(p_user) then
    raise exception 'This is a super administrator. Revoke that first, then delete.'
      using errcode = 'P0001';
  end if;

  select p.full_name, u.email, p.role::text into v_name, v_email, v_role
    from profiles p left join auth.users u on u.id = p.id
   where p.id = p_user;

  if v_name is null then
    raise exception 'No such account.' using errcode = 'P0001';
  end if;

  -- Stop them acting before anything else happens.
  update profiles set is_active = false, pin_hash = null where id = p_user;

  -- The tombstone, written before the attribution is detached.
  --
  -- private.activity_log.actor_id carries no foreign key, precisely so that a
  -- person's activity trail outlives their account. Everything this deletion
  -- is about to unpick is named here first, so the log still reads as a
  -- sentence months later rather than as an orphaned uuid.
  insert into private.activity_log (
    actor_id, actor_hidden, category, event, summary, target_type, target_id, meta)
  values (
    auth.uid(), true, 'security', 'admin.user_deleted',
    format('Permanently deleted %s (%s, %s)', v_name, coalesce(v_email, 'no email'), v_role),
    'profile', p_user::text,
    jsonb_build_object('name', v_name, 'email', v_email, 'role', v_role, 'user_id', p_user));

  -- Detach every reference that would otherwise refuse the delete.
  --
  -- Each of these is a real loss and the counts are returned so the console can
  -- say what it cost rather than reporting a bare "deleted".
  update runs set created_by = null where created_by = p_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('runs_created', n);

  update runs set operator_id = null where operator_id = p_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('runs_operated', n);

  update runs set supervisor_id = null where supervisor_id = p_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('runs_supervised', n);

  update runs set briefing_ack_by = null where briefing_ack_by = p_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('briefings_acked', n);

  update job_files set created_by = null where created_by = p_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('job_files', n);

  update artwork_revisions set created_by = null where created_by = p_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('artwork_revisions', n);

  update cylinder_events set performed_by = null where performed_by = p_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('cylinder_events', n);

  update observations set reported_by = null where reported_by = p_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('observations', n);

  update observations set next_run_note_cleared_by = null where next_run_note_cleared_by = p_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('notes_cleared', n);

  update attachments set uploaded_by = null where uploaded_by = p_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('attachments', n);

  update audit_log set changed_by = null where changed_by = p_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('audit_entries', n);

  -- notifications.recipient_id and notification_prefs cascade from profiles;
  -- notifications.actor_id is already ON DELETE SET NULL.

  return jsonb_build_object(
    'ok', true, 'name', v_name, 'email', v_email, 'role', v_role, 'detached', v_counts);
end;
$fn$;


-- -----------------------------------------------------------------------------
-- 3. Signals worth looking at
--
-- The console asked to be a monitoring tool, so it should surface the accounts
-- worth a second look rather than making someone read the whole stream to find
-- them. Nothing here is a verdict -- each row is a reason to go and look.
-- -----------------------------------------------------------------------------

create or replace function fn_sa_signals(p_hours int default 24)
returns jsonb
language plpgsql stable security definer set search_path = public, private as $fn$
declare
  v_since timestamptz := now() - make_interval(hours => greatest(coalesce(p_hours, 24), 1));
begin
  perform fn_sa_guard();

  return jsonb_build_object(
    'window_hours', greatest(coalesce(p_hours, 24), 1),

    -- Repeated failures against one address. A spray across many made-up
    -- addresses looks different and is grouped the same way so you can tell.
    'failed_sign_ins', (
      select coalesce(jsonb_agg(x order by x.attempts desc), '[]'::jsonb) from (
        select coalesce(actor_email, 'unknown') as email, count(*) as attempts,
               max(occurred_at) as last_attempt,
               count(distinct ip) as distinct_ips
          from private.activity_log
         where event = 'auth.sign_in_failed' and occurred_at >= v_since
         group by 1 having count(*) >= 3
         limit 20) x),

    -- Wrong PIN at a tablet is somebody trying to be attributed as someone
    -- else, which on this floor is the attribution trail being attacked.
    'pin_failures', (
      select coalesce(jsonb_agg(x order by x.attempts desc), '[]'::jsonb) from (
        select l.target_id as user_id, max(p.full_name) as name,
               count(*) as attempts, max(l.occurred_at) as last_attempt
          from private.activity_log l
          left join profiles p on p.id::text = l.target_id
         where l.event = 'auth.pin_failed' and l.occurred_at >= v_since
         group by l.target_id having count(*) >= 3
         limit 20) x),

    -- Refused writes. One is a mis-click; a run of them is somebody probing
    -- what their role can reach.
    'refusals', (
      select coalesce(jsonb_agg(x order by x.events desc), '[]'::jsonb) from (
        select actor_id, max(actor_name) as name, max(actor_role) as role,
               count(*) as events, max(occurred_at) as last_seen
          from private.activity_log
         where category = 'security' and event not like 'auth.%'
           and occurred_at >= v_since and actor_id is not null
         group by actor_id limit 20) x),

    -- Unusual volume. Not wrong, but a viewer opening four hundred pages in a
    -- day is a different shape from a viewer checking a job.
    'heavy_readers', (
      select coalesce(jsonb_agg(x order by x.pages desc), '[]'::jsonb) from (
        select actor_id, max(actor_name) as name, max(actor_role) as role,
               count(*) as pages, max(occurred_at) as last_seen
          from private.activity_log
         where event = 'page.view' and occurred_at >= v_since and actor_id is not null
         group by actor_id having count(*) >= 200
         order by count(*) desc limit 10) x),

    -- Deletions are the one action that removes evidence.
    'deletions', (
      select coalesce(jsonb_agg(x order by x.n desc), '[]'::jsonb) from (
        select al.changed_by as actor_id, max(p.full_name) as name,
               count(*) as n, max(al.changed_at) as last_seen
          from audit_log al left join profiles p on p.id = al.changed_by
         where al.action = 'DELETE' and al.changed_at >= v_since
         group by al.changed_by limit 20) x),

    -- Dormant accounts that can still sign in are the ones nobody notices.
    'dormant', (
      select coalesce(jsonb_agg(x order by x.last_sign_in_at nulls first), '[]'::jsonb) from (
        select p.id, p.full_name, p.role::text as role, u.last_sign_in_at
          from profiles p join auth.users u on u.id = p.id
         where p.is_active
           and not fn_is_hidden(p.id)
           and (u.last_sign_in_at is null or u.last_sign_in_at < now() - interval '60 days')
         limit 20) x)
  );
end;
$fn$;


grant execute on function fn_sa_suspend_user(uuid, text, boolean) to authenticated;
grant execute on function fn_sa_prepare_delete(uuid)              to authenticated;
grant execute on function fn_sa_signals(int)                      to authenticated;
