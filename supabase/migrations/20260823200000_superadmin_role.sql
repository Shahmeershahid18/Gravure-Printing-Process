-- =============================================================================
-- The hidden super administrator, and the activity log only they can read.
--
-- Three requirements drive every decision in this file:
--
--   1. Total control. The super admin passes every row level policy in the
--      schema, including the ones that would otherwise stop an admin.
--   2. Hidden from everyone. Not "greyed out", not "admin only" -- absent.
--      Their profile row does not appear in the users list, the operator
--      picker, the audit trail or any count. Every other role's view of the
--      system is exactly what it was before the account existed.
--   3. A log of what every user does, readable by nobody else.
--
-- The mechanism for (1) is deliberately small. Every write policy in
-- 20260823090000 is expressed through fn_role_in(), and every read through
-- fn_is_authed(). Teaching those two functions about the super admin grants
-- the whole schema in eight lines, with no policy rewritten and therefore no
-- policy that can be forgotten when a table is added later.
--
-- The mechanism for (2) and (3) is the `private` schema. PostgREST exposes
-- `public` only, so a table in `private` is not reachable through the API at
-- any privilege level -- it is absent from the schema cache, so it does not
-- appear in the OpenAPI description either. Nothing in `private` can leak by
-- forgetting a GRANT, because there is no route to it. The console reaches its
-- data through named security definer functions that each check the caller.
-- =============================================================================


create schema if not exists private;
revoke all on schema private from public, anon, authenticated;


-- -----------------------------------------------------------------------------
-- 1. The grant table
--
-- Membership lives here and nowhere else. There is deliberately no UI that can
-- create the first row: it is granted from the SQL console with
-- fn_grant_superadmin(), which is revoked from every API role below.
-- -----------------------------------------------------------------------------

create table if not exists private.superadmins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id),
  note       text
);


-- -----------------------------------------------------------------------------
-- 2. Predicates
--
-- fn_is_superadmin() is safe to expose: it answers only about the caller, and
-- returns false for everyone who is not one. fn_is_hidden() answers about an
-- arbitrary profile and is needed inside policies, which are evaluated as the
-- calling role -- so it must be executable by `authenticated` even though the
-- table behind it is not.
-- -----------------------------------------------------------------------------

create or replace function fn_is_superadmin() returns boolean
language sql stable security definer set search_path = public, private as $fn$
  select exists (select 1 from private.superadmins where user_id = auth.uid());
$fn$;

create or replace function fn_is_hidden(p_id uuid) returns boolean
language sql stable security definer set search_path = public, private as $fn$
  select p_id is not null
     and exists (select 1 from private.superadmins where user_id = p_id);
$fn$;

grant execute on function fn_is_superadmin() to authenticated;
grant execute on function fn_is_hidden(uuid) to authenticated;


-- -----------------------------------------------------------------------------
-- 3. Total control, by widening the two predicates every policy already uses
--
-- Both keep their original bodies. The super admin is an additional way to
-- satisfy them, never a replacement, so nothing any existing role could do
-- changes.
-- -----------------------------------------------------------------------------

create or replace function fn_role_in(variadic p_roles user_role[])
returns boolean language sql stable security definer set search_path = public as $fn$
  select fn_is_superadmin() or exists (
    select 1 from profiles
     where id = auth.uid() and is_active and role = any(p_roles)
  );
$fn$;

create or replace function fn_is_authed() returns boolean
language sql stable security definer set search_path = public as $fn$
  select fn_is_superadmin() or exists (
    select 1 from profiles where id = auth.uid() and is_active
  );
$fn$;

-- Runs carry their own lock and machine rules on top of the role check, so
-- this one needs widening separately.
create or replace function fn_can_write_run(p_run_id uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select fn_is_superadmin() or exists (
    select 1 from runs r
     where r.id = p_run_id
       and r.deleted_at is null
       and (
         fn_role_in('admin','supervisor')
         or (fn_role_in('planner') and r.locked_at is null)
         or (fn_role_in('operator') and r.machine_id = fn_my_machine() and r.locked_at is null)
       )
  );
$fn$;

-- A locked run refuses every write at the trigger, below RLS. The super admin
-- is the one identity that can correct a locked run without unlocking it first
-- and leaving a window in which the floor can edit it too.
create or replace function fn_check_run_lock()
returns trigger language plpgsql security definer set search_path = public, private as $fn$
begin
  if fn_is_superadmin() then
    return coalesce(NEW, OLD);
  end if;

  if (TG_OP = 'UPDATE' or TG_OP = 'DELETE') then
    if (OLD.is_locked = true) then
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
$fn$;

create or replace function fn_check_run_station_lock()
returns trigger language plpgsql security definer set search_path = public, private as $fn$
declare
  v_is_locked boolean;
begin
  if fn_is_superadmin() then
    return coalesce(NEW, OLD);
  end if;
  select is_locked into v_is_locked from runs where id = coalesce(NEW.run_id, OLD.run_id);
  if (v_is_locked = true) then
    raise exception 'Parent run is locked. Cannot modify run_stations.';
  end if;
  return coalesce(NEW, OLD);
end;
$fn$;


-- -----------------------------------------------------------------------------
-- 4. Hiding the account
--
-- The profile row is filtered out of every read by anyone else. `id =
-- auth.uid()` comes first so a super admin can always read their own row even
-- through the ordinary path.
-- -----------------------------------------------------------------------------

drop policy if exists "read all authed" on profiles;
create policy "read all authed" on profiles
  for select to authenticated
  using (
    auth.uid() is not null
    and (id = auth.uid() or fn_is_superadmin() or not fn_is_hidden(id))
  );

-- An admin may not edit or delete what they cannot see. Without this an admin
-- could still deactivate the hidden account by guessing its uuid -- and the
-- users screen, which lists every profile, would have shown that uuid before
-- the read policy above was tightened.
drop policy if exists "admin update" on profiles;
create policy "admin update" on profiles
  for update to authenticated
  using      (fn_is_superadmin() or (fn_role_in('admin') and not fn_is_hidden(id)))
  with check (fn_is_superadmin() or (fn_role_in('admin') and not fn_is_hidden(id)));

drop policy if exists "admin delete" on profiles;
create policy "admin delete" on profiles
  for delete to authenticated
  using (fn_is_superadmin() or (fn_role_in('admin') and not fn_is_hidden(id)));

-- RLS is not the only route to a row: fn_set_operator_pin and friends are
-- security definer and run past it. A trigger closes that off wherever it is
-- reached from, while still leaving the SQL console (no JWT, so auth.uid() is
-- null) able to undo the grant if the account is ever lost.
create or replace function fn_protect_hidden_profile()
returns trigger language plpgsql security definer set search_path = public, private as $fn$
begin
  if auth.uid() is null then
    return coalesce(NEW, OLD);
  end if;
  if fn_is_hidden(OLD.id) and not fn_is_superadmin() then
    -- Deliberately the same message PostgREST gives for any denied row, so a
    -- probing admin learns nothing from having hit a special case.
    raise exception 'permission denied' using errcode = '42501';
  end if;
  return coalesce(NEW, OLD);
end;
$fn$;

drop trigger if exists tr_protect_hidden_profile on profiles;
create trigger tr_protect_hidden_profile
  before update or delete on profiles
  for each row execute function fn_protect_hidden_profile();

-- The kiosk operator picker.
create or replace view v_operator_directory
with (security_invoker = on) as
select p.id, p.full_name, p.employee_no, p.default_machine_id,
       p.has_pin,
       m.code as machine_code
from profiles p
left join machines m on m.id = p.default_machine_id
where p.role = 'operator' and p.is_active and not fn_is_hidden(p.id);

revoke all on v_operator_directory from anon;
grant select on v_operator_directory to authenticated;

-- The business audit trail. An admin and a supervisor keep everything they had
-- except rows attributed to the hidden account, which disappear rather than
-- appearing as an unexplained uuid.
drop policy if exists "admin supervisor read" on audit_log;
drop policy if exists "Planners can view audit logs" on audit_log;
create policy "audit read" on audit_log
  for select to authenticated
  using (
    fn_is_superadmin()
    or (fn_role_in('admin','supervisor') and not fn_is_hidden(changed_by))
  );


-- -----------------------------------------------------------------------------
-- 5. Granting and revoking
--
-- By email, because a uuid is not something anyone has to hand when they are
-- setting this up, and getting it wrong silently grants the wrong person.
-- Both are revoked from anon and authenticated: the only callers are the SQL
-- console, the service role, and the console's own RPC in section 8.
-- -----------------------------------------------------------------------------

create or replace function fn_grant_superadmin(p_email text, p_note text default null)
returns text language plpgsql security definer set search_path = public, private as $fn$
declare
  v_id uuid;
begin
  select id into v_id from auth.users where lower(email) = lower(trim(p_email));
  if v_id is null then
    return format('No account exists for %s. Create the sign-in first, then run this again.', p_email);
  end if;

  insert into private.superadmins (user_id, granted_by, note)
  values (v_id, auth.uid(), p_note)
  on conflict (user_id) do update set note = coalesce(excluded.note, private.superadmins.note);

  return format('%s is now a super administrator and is hidden from every other account.', p_email);
end;
$fn$;

create or replace function fn_revoke_superadmin(p_email text)
returns text language plpgsql security definer set search_path = public, private as $fn$
declare
  v_id uuid;
begin
  select id into v_id from auth.users where lower(email) = lower(trim(p_email));
  if v_id is null then return format('No account exists for %s.', p_email); end if;
  delete from private.superadmins where user_id = v_id;
  return format('%s is no longer a super administrator and is visible again.', p_email);
end;
$fn$;

revoke all on function fn_grant_superadmin(text, text)  from public, anon, authenticated;
revoke all on function fn_revoke_superadmin(text)       from public, anon, authenticated;


-- -----------------------------------------------------------------------------
-- 6. The activity log
--
-- Separate from audit_log on purpose. audit_log answers "what changed on this
-- run" for a supervisor investigating a reject. This answers "what has this
-- person been doing", which is a different question with a different audience
-- and no business reason for an admin to hold.
--
-- bigint identity rather than uuid: this is the highest-volume table in the
-- schema and it is only ever read in time order.
-- -----------------------------------------------------------------------------

create table if not exists private.activity_log (
  id           bigint generated always as identity primary key,
  occurred_at  timestamptz not null default now(),
  actor_id     uuid,
  actor_email  text,
  actor_name   text,
  actor_role   text,
  actor_hidden boolean not null default false,
  category     text not null default 'general',   -- auth | page | data | admin | security | general
  event        text not null,                     -- auth.sign_in | page.view | data.update | ...
  summary      text,
  target_type  text,
  target_id    text,
  path         text,
  ip           text,
  user_agent   text,
  meta         jsonb not null default '{}'::jsonb
);

create index if not exists activity_recent_idx   on private.activity_log (occurred_at desc);
create index if not exists activity_actor_idx    on private.activity_log (actor_id, occurred_at desc);
create index if not exists activity_category_idx on private.activity_log (category, occurred_at desc);
create index if not exists activity_event_idx    on private.activity_log (event, occurred_at desc);

-- Writing is open to any caller; reading is not possible at all except through
-- section 8. An append-only log that the logged party can erase is decoration,
-- so there is no delete path outside fn_sa_prune_activity().
create or replace function fn_log_activity(
  p_event       text,
  p_category    text default 'general',
  p_summary     text default null,
  p_target_type text default null,
  p_target_id   text default null,
  p_path        text default null,
  p_meta        jsonb default '{}'::jsonb,
  p_ip          text default null,
  p_user_agent  text default null,
  p_actor_email text default null
) returns void
language plpgsql security definer set search_path = public, private as $fn$
declare
  v_uid   uuid := auth.uid();
  v_name  text;
  v_role  text;
  v_email text := p_actor_email;
begin
  -- A signed-out caller can only write auth events. Without this the anon key
  -- is a write handle on the log for anyone who finds the function.
  if v_uid is null and p_event not like 'auth.%' then
    return;
  end if;

  if v_uid is not null then
    select p.full_name, p.role::text into v_name, v_role from profiles p where p.id = v_uid;
    select u.email into v_email from auth.users u where u.id = v_uid;
  end if;

  insert into private.activity_log (
    actor_id, actor_email, actor_name, actor_role, actor_hidden,
    category, event, summary, target_type, target_id, path, ip, user_agent, meta)
  values (
    v_uid, v_email, v_name, v_role, fn_is_hidden(v_uid),
    coalesce(nullif(trim(p_category), ''), 'general'),
    p_event,
    left(p_summary, 500),
    p_target_type, left(p_target_id, 100), left(p_path, 300),
    left(p_ip, 60), left(p_user_agent, 400),
    coalesce(p_meta, '{}'::jsonb));
end;
$fn$;

grant execute on function fn_log_activity(text, text, text, text, text, text, jsonb, text, text, text)
  to authenticated, anon;


-- -----------------------------------------------------------------------------
-- 7. Auditing every table, not two
--
-- The original trigger covered runs and cylinders, and recorded updates and
-- deletes. A log that cannot tell you who created the row is half a log, so
-- inserts are recorded too, and every table carrying a business fact gets the
-- trigger.
--
-- Two tables are keyed on something other than a uuid `id`: colour_names on
-- `name`, run_process on `run_id`. audit_log.record_id keeps its uuid type for
-- the existing reader, and the real key travels in old_data/new_data, which is
-- where a reader looks anyway.
-- -----------------------------------------------------------------------------

-- Columns that must never be copied into audit_log.
--
-- audit_log stores whole rows, and admins and supervisors read it. Auditing
-- `profiles` without this would put every operator's bcrypt PIN hash into a
-- table two roles can select -- undoing, by a side door, the column-level
-- revoke in 20260823140000 that exists because bcrypt over a 4-digit space is
-- 10,000 candidates and a leaked hash is a leaked PIN.
--
-- The redaction marker is kept rather than the key being dropped, so a reader
-- can see that the field changed without learning what it changed to.
create or replace function fn_audit_redact(p_row jsonb) returns jsonb
language sql immutable set search_path = public as $fn$
  select case
    when p_row is null then null
    when p_row ? 'pin_hash'
      then jsonb_set(p_row, '{pin_hash}',
             to_jsonb(case when p_row ->> 'pin_hash' is null then null else '[redacted]' end))
    else p_row
  end;
$fn$;

create or replace function fn_audit_trigger()
returns trigger language plpgsql security definer set search_path = public, private as $fn$
declare
  v_old jsonb := case when TG_OP <> 'INSERT' then fn_audit_redact(to_jsonb(OLD)) end;
  v_new jsonb := case when TG_OP <> 'DELETE' then fn_audit_redact(to_jsonb(NEW)) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_key text  := coalesce(v_row ->> 'id', v_row ->> 'run_id', v_row ->> 'name');
  v_id  uuid;
begin
  begin
    v_id := v_key::uuid;
  exception when others then
    v_id := null;
  end;

  insert into audit_log (table_name, record_id, action, old_data, new_data, changed_by)
  values (TG_TABLE_NAME,
          coalesce(v_id, '00000000-0000-0000-0000-000000000000'::uuid),
          TG_OP, v_old, v_new, auth.uid());

  -- The same event, flattened into the super admin's single stream. Keeping
  -- one chronological view of a person's session is the whole point of that
  -- screen, and stitching it together from two tables at read time would cost
  -- more than writing it twice.
  --
  -- Except for the station grid. run_stations and run_process are rewritten by
  -- an 800ms autosave while a run is on the press -- eight rows, several
  -- fields each -- and mirroring that into the activity stream would bury a
  -- shift's real events under thousands of identical "updated run_stations"
  -- lines and roughly double the write volume of the busiest path in the
  -- product. The full before/after for those rows is still in audit_log, which
  -- is where anyone investigating a specific run looks; the activity stream
  -- records the run-level events instead, which is the altitude it reads at.
  if TG_TABLE_NAME not in ('run_stations', 'run_process') then
    insert into private.activity_log (
      actor_id, actor_name, actor_role, actor_hidden,
      category, event, summary, target_type, target_id, meta)
    select auth.uid(), p.full_name, p.role::text, fn_is_hidden(auth.uid()),
           'data', 'data.' || lower(TG_OP), TG_TABLE_NAME, TG_TABLE_NAME, v_key,
           jsonb_build_object('table', TG_TABLE_NAME, 'op', TG_OP)
      from (select 1) z
      left join profiles p on p.id = auth.uid();
  end if;

  return case when TG_OP = 'DELETE' then OLD else NEW end;
end;
$fn$;

do $do$
declare
  t text;
  audited text[] := array[
    'profiles','customers','machines','suppliers','colour_names','issue_templates',
    'cylinder_life_rules','ink_products','ink_batches','substrate_batches',
    'job_files','artwork_revisions','artwork_revision_cylinders',
    'cylinders','cylinder_events','runs','run_stations','run_process',
    'run_substrates','observations','attachments'
  ];
begin
  foreach t in array audited loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('drop trigger if exists tr_audit_%1$s on public.%1$I', t);
    execute format(
      'create trigger tr_audit_%1$s after insert or update or delete on public.%1$I
         for each row execute function fn_audit_trigger()', t);
  end loop;
end
$do$;


-- -----------------------------------------------------------------------------
-- 8. What the console can read
--
-- Every function here begins with the same guard. A non-super-admin gets
-- exactly the error PostgREST returns for any function it will not run, so
-- probing tells them nothing about whether the function is special.
-- -----------------------------------------------------------------------------

create or replace function fn_sa_guard() returns void
language plpgsql stable security definer set search_path = public, private as $fn$
begin
  if not fn_is_superadmin() then
    raise exception 'permission denied' using errcode = '42501';
  end if;
end;
$fn$;

-- Headline counts for the console overview.
create or replace function fn_sa_overview() returns jsonb
language plpgsql stable security definer set search_path = public, private as $fn$
begin
  perform fn_sa_guard();
  return jsonb_build_object(
    'users', (select jsonb_build_object(
                'total',    count(*),
                'active',   count(*) filter (where is_active),
                'inactive', count(*) filter (where not is_active),
                'hidden',   (select count(*) from private.superadmins))
              from profiles),
    'by_role', (select coalesce(jsonb_object_agg(role, n), '{}'::jsonb)
                  from (select role::text as role, count(*) as n
                          from profiles where is_active group by role) r),
    'activity', (select jsonb_build_object(
                   'total',      count(*),
                   'last_hour',  count(*) filter (where occurred_at > now() - interval '1 hour'),
                   'last_day',   count(*) filter (where occurred_at > now() - interval '1 day'),
                   'last_week',  count(*) filter (where occurred_at > now() - interval '7 days'),
                   'sign_ins_today', count(*) filter (
                       where event = 'auth.sign_in' and occurred_at > date_trunc('day', now())),
                   'failed_today',   count(*) filter (
                       where event = 'auth.sign_in_failed' and occurred_at > date_trunc('day', now())))
                 from private.activity_log),
    'online', (select coalesce(jsonb_agg(x order by x.last_seen desc), '[]'::jsonb) from (
                 select actor_id, max(actor_name) as actor_name, max(actor_role) as actor_role,
                        max(occurred_at) as last_seen, count(*) as events
                   from private.activity_log
                  where occurred_at > now() - interval '15 minutes' and actor_id is not null
                  group by actor_id) x),
    'notifications', (select jsonb_build_object(
                        'total', count(*),
                        'unread', count(*) filter (where read_at is null))
                      from notifications),
    'generated_at', now()
  );
end;
$fn$;

-- Every account, hidden ones included, with the sign-in facts the profiles
-- table does not carry.
create or replace function fn_sa_users() returns jsonb
language plpgsql stable security definer set search_path = public, private as $fn$
begin
  perform fn_sa_guard();
  return (
    select coalesce(jsonb_agg(x order by x.full_name), '[]'::jsonb) from (
      select p.id, p.full_name, p.employee_no, p.role::text as role, p.is_active,
             p.has_pin, p.created_at, m.code as machine_code,
             u.email, u.last_sign_in_at, u.email_confirmed_at, u.banned_until,
             (s.user_id is not null) as is_superadmin,
             s.granted_at as superadmin_since,
             (select count(*) from private.activity_log a where a.actor_id = p.id) as event_count,
             (select max(a.occurred_at) from private.activity_log a where a.actor_id = p.id) as last_seen,
             (select count(*) from notifications n
               where n.recipient_id = p.id and n.read_at is null) as unread_notifications
        from profiles p
        left join auth.users u on u.id = p.id
        left join machines m   on m.id = p.default_machine_id
        left join private.superadmins s on s.user_id = p.id
    ) x
  );
end;
$fn$;

-- The activity stream. Filters are all optional and all applied server side,
-- because the point of this table is that its rows never leave the database
-- except to the one reader entitled to them.
create or replace function fn_sa_activity(
  p_limit    int         default 100,
  p_offset   int         default 0,
  p_actor    uuid        default null,
  p_category text        default null,
  p_event    text        default null,
  p_since    timestamptz default null,
  p_search   text        default null
) returns jsonb
language plpgsql stable security definer set search_path = public, private as $fn$
declare
  v_rows  jsonb;
  v_total bigint;
  v_lim   int := least(greatest(coalesce(p_limit, 100), 1), 500);
begin
  perform fn_sa_guard();

  with filtered as (
    select *
      from private.activity_log a
     where (p_actor    is null or a.actor_id = p_actor)
       and (p_category is null or a.category = p_category)
       and (p_event    is null or a.event like p_event || '%')
       and (p_since    is null or a.occurred_at >= p_since)
       and (p_search   is null or p_search = '' or
            (coalesce(a.actor_name, '') || ' ' || coalesce(a.actor_email, '') || ' ' ||
             coalesce(a.summary, '')    || ' ' || coalesce(a.path, '')        || ' ' ||
             a.event) ilike '%' || p_search || '%')
  )
  select (select count(*) from filtered),
         (select coalesce(jsonb_agg(to_jsonb(f) order by f.occurred_at desc, f.id desc), '[]'::jsonb)
            from (select * from filtered order by occurred_at desc, id desc
                   limit v_lim offset greatest(coalesce(p_offset, 0), 0)) f)
    into v_total, v_rows;

  return jsonb_build_object('total', v_total, 'rows', v_rows);
end;
$fn$;

-- One person's whole trail, for the drill-down from the users list.
create or replace function fn_sa_user_detail(p_user uuid, p_limit int default 200)
returns jsonb
language plpgsql stable security definer set search_path = public, private as $fn$
begin
  perform fn_sa_guard();
  return jsonb_build_object(
    'profile', (
      select to_jsonb(x) from (
        select p.id, p.full_name, p.employee_no, p.role::text as role, p.is_active,
               p.has_pin, p.created_at, u.email, u.last_sign_in_at,
               (s.user_id is not null) as is_superadmin, m.code as machine_code
          from profiles p
          left join auth.users u on u.id = p.id
          left join machines m on m.id = p.default_machine_id
          left join private.superadmins s on s.user_id = p.id
         where p.id = p_user) x),
    'counts', (
      select coalesce(jsonb_object_agg(category, n), '{}'::jsonb)
        from (select category, count(*) as n from private.activity_log
               where actor_id = p_user group by category) c),
    'activity', (
      select coalesce(jsonb_agg(to_jsonb(a) order by a.occurred_at desc), '[]'::jsonb)
        from (select * from private.activity_log where actor_id = p_user
               order by occurred_at desc limit least(greatest(coalesce(p_limit, 200), 1), 500)) a),
    'changes', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', al.id, 'table_name', al.table_name, 'record_id', al.record_id,
               'action', al.action, 'changed_at', al.changed_at)
               order by al.changed_at desc), '[]'::jsonb)
        from (select * from audit_log where changed_by = p_user
               order by changed_at desc limit 100) al)
  );
end;
$fn$;

-- The full audit trail, unfiltered by the hidden-actor rule that applies to
-- admins and supervisors.
create or replace function fn_sa_audit(
  p_limit  int  default 100,
  p_offset int  default 0,
  p_table  text default null,
  p_actor  uuid default null,
  p_action text default null
) returns jsonb
language plpgsql stable security definer set search_path = public, private as $fn$
declare
  v_rows jsonb; v_total bigint;
  v_lim int := least(greatest(coalesce(p_limit, 100), 1), 500);
begin
  perform fn_sa_guard();

  with filtered as (
    select al.*, p.full_name as changed_by_name, p.role::text as changed_by_role,
           (s.user_id is not null) as changed_by_hidden
      from audit_log al
      left join profiles p on p.id = al.changed_by
      left join private.superadmins s on s.user_id = al.changed_by
     where (p_table  is null or al.table_name = p_table)
       and (p_actor  is null or al.changed_by = p_actor)
       and (p_action is null or al.action = p_action)
  )
  select (select count(*) from filtered),
         (select coalesce(jsonb_agg(to_jsonb(f) order by f.changed_at desc), '[]'::jsonb)
            from (select * from filtered order by changed_at desc
                   limit v_lim offset greatest(coalesce(p_offset, 0), 0)) f)
    into v_total, v_rows;

  return jsonb_build_object('total', v_total, 'rows', v_rows);
end;
$fn$;

-- Which tables the audit trail actually holds, for the filter dropdown.
create or replace function fn_sa_audit_tables() returns jsonb
language plpgsql stable security definer set search_path = public, private as $fn$
begin
  perform fn_sa_guard();
  return (select coalesce(jsonb_agg(t order by t), '[]'::jsonb)
            from (select distinct table_name as t from audit_log) x);
end;
$fn$;


-- -----------------------------------------------------------------------------
-- 9. What the console can do
--
-- Writing through RLS would work -- the super admin passes every policy -- but
-- routing it through named functions means each privileged act writes its own
-- admin-category log entry, so the console is as accountable as everyone else.
-- -----------------------------------------------------------------------------

create or replace function fn_sa_set_user(
  p_user      uuid,
  p_role      user_role default null,
  p_is_active boolean   default null,
  p_full_name text      default null
) returns jsonb
language plpgsql security definer set search_path = public, private as $fn$
declare v_before jsonb; v_after jsonb;
begin
  perform fn_sa_guard();

  select fn_audit_redact(to_jsonb(p)) into v_before from profiles p where p.id = p_user;
  if v_before is null then
    raise exception 'No such account.' using errcode = 'P0001';
  end if;

  update profiles
     set role      = coalesce(p_role, role),
         is_active = coalesce(p_is_active, is_active),
         full_name = coalesce(nullif(trim(p_full_name), ''), full_name)
   where id = p_user
  returning fn_audit_redact(to_jsonb(profiles.*)) into v_after;

  insert into private.activity_log (
    actor_id, actor_name, actor_role, actor_hidden, category, event,
    summary, target_type, target_id, meta)
  select auth.uid(), p.full_name, p.role::text, true, 'admin', 'admin.user_changed',
         format('Changed %s', v_after ->> 'full_name'), 'profile', p_user::text,
         jsonb_build_object(
           'role',      jsonb_build_object('from', v_before ->> 'role',      'to', v_after ->> 'role'),
           'is_active', jsonb_build_object('from', v_before ->> 'is_active', 'to', v_after ->> 'is_active'))
    from (select 1) z
    left join profiles p on p.id = auth.uid();

  return v_after;
end;
$fn$;

create or replace function fn_sa_set_superadmin(p_user uuid, p_on boolean)
returns jsonb
language plpgsql security definer set search_path = public, private as $fn$
declare v_count int;
begin
  perform fn_sa_guard();

  if p_on then
    insert into private.superadmins (user_id, granted_by)
    values (p_user, auth.uid())
    on conflict (user_id) do nothing;
  else
    -- Removing the last one leaves the console permanently unreachable from
    -- the application, recoverable only from the SQL console.
    select count(*) into v_count from private.superadmins;
    if v_count <= 1 then
      raise exception 'This is the only super administrator. Grant another one first.'
        using errcode = 'P0001';
    end if;
    delete from private.superadmins where user_id = p_user;
  end if;

  insert into private.activity_log (
    actor_id, actor_hidden, category, event, summary, target_type, target_id)
  values (auth.uid(), true, 'admin',
          case when p_on then 'admin.superadmin_granted' else 'admin.superadmin_revoked' end,
          (select full_name from profiles where id = p_user), 'profile', p_user::text);

  return jsonb_build_object('ok', true, 'is_superadmin', p_on);
end;
$fn$;

-- Retention.
--
-- Nothing calls this on a schedule; it exists so both logs can be cut back
-- deliberately rather than growing without a stated bound. That bound matters
-- more than it did: section 7 puts an audit trigger on run_stations, which is
-- rewritten by an 800ms autosave through every run, so audit_log is now the
-- fastest-growing table in the schema by a wide margin.
--
-- Seven days is the floor. A retention window shorter than a shift pattern
-- means the log cannot answer a question raised the following Monday, which is
-- when these questions are actually asked.
create or replace function fn_sa_prune_activity(
  p_older_than_days int default 180,
  p_include_audit   boolean default false
) returns jsonb
language plpgsql security definer set search_path = public, private as $fn$
declare
  v_days    int := greatest(coalesce(p_older_than_days, 180), 7);
  v_cutoff  timestamptz := now() - make_interval(days => v_days);
  v_deleted bigint;
  v_audit   bigint := 0;
begin
  perform fn_sa_guard();

  delete from private.activity_log where occurred_at < v_cutoff;
  get diagnostics v_deleted = row_count;

  if p_include_audit then
    delete from audit_log where changed_at < v_cutoff;
    get diagnostics v_audit = row_count;
  end if;

  insert into private.activity_log (actor_id, actor_hidden, category, event, summary, meta)
  values (auth.uid(), true, 'admin', 'admin.activity_pruned',
          format('Removed %s activity entries and %s change records older than %s days',
                 v_deleted, v_audit, v_days),
          jsonb_build_object('activity', v_deleted, 'audit', v_audit, 'days', v_days));

  return jsonb_build_object('deleted', v_deleted, 'audit_deleted', v_audit);
end;
$fn$;

grant execute on function fn_sa_overview()                                   to authenticated;
grant execute on function fn_sa_users()                                      to authenticated;
grant execute on function fn_sa_activity(int, int, uuid, text, text, timestamptz, text) to authenticated;
grant execute on function fn_sa_user_detail(uuid, int)                       to authenticated;
grant execute on function fn_sa_audit(int, int, text, uuid, text)            to authenticated;
grant execute on function fn_sa_audit_tables()                               to authenticated;
grant execute on function fn_sa_set_user(uuid, user_role, boolean, text)     to authenticated;
grant execute on function fn_sa_set_superadmin(uuid, boolean)                to authenticated;
grant execute on function fn_sa_prune_activity(int, boolean)                 to authenticated;


-- =============================================================================
-- Granting the first super administrator
--
-- There is no UI for this, by design. From the Supabase SQL editor:
--
--   select fn_grant_superadmin('you@example.com');
--
-- The account must already exist. It keeps whatever ordinary role it has --
-- 'viewer' is the least conspicuous -- and gains everything regardless. From
-- that moment it is absent from Settings -> Users, the operator picker and the
-- audit trail for every other account, and /control opens for it alone.
--
-- To undo:  select fn_revoke_superadmin('you@example.com');
-- =============================================================================
