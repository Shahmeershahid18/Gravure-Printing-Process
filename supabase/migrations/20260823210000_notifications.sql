-- =============================================================================
-- Notifications.
--
-- The product already tells you what is true right now: the shift board, the
-- run list and the briefing all re-render live. What it has never done is tell
-- you that something changed while you were looking somewhere else -- and on a
-- floor where a planner, a supervisor and four presses are working the same
-- job file, that is most of the day.
--
-- Three decisions worth stating, because each has a cheaper wrong answer.
--
-- 1. FAN-OUT ON WRITE. One row per recipient, not one event row plus a read
--    receipt table. Every question this feature has to answer quickly is
--    per-person -- "how many unread do I have", "mark mine read" -- and those
--    are an index lookup here and a join-and-anti-join in the other shape. RLS
--    is also a single predicate (`recipient_id = auth.uid()`) rather than a
--    subquery, which matters because Realtime evaluates it per subscriber on
--    every event. The cost is duplicated title text across a handful of rows.
--    With six roles in one factory that is the right trade; at a thousand
--    recipients it would not be.
--
-- 2. ROUTING IS DATA. Which roles hear about a completed run lives in
--    notification_types, not in the body of each trigger. Otherwise the answer
--    to "stop paging QC about planned runs" is a migration.
--
-- 3. THE DATABASE RAISES THEM, NOT THE SERVER ACTIONS. A run can be completed
--    from the desktop, from the tablet, from the offline queue replaying, or
--    by an admin correcting history. Hanging the notification off the write
--    itself is the only version that cannot be bypassed by a path someone adds
--    later.
-- =============================================================================


create type notification_category as enum (
  'run_planned', 'run_started', 'run_completed', 'run_aborted', 'run_locked',
  'observation_raised', 'observation_critical', 'next_run_note',
  'cylinder_wear', 'cylinder_condition',
  'job_created', 'job_status', 'artwork_revision', 'artwork_approval',
  'user_changed', 'broadcast'
);

create type notification_severity as enum ('info', 'success', 'warning', 'critical');


-- -----------------------------------------------------------------------------
-- 1. The catalogue
--
-- One row per kind of event: who hears it by default, what to call it on the
-- preferences screen, and whether it is on to begin with.
-- -----------------------------------------------------------------------------

create table notification_types (
  category        notification_category primary key,
  label           text not null,
  description     text not null,
  default_roles   user_role[] not null,
  default_enabled boolean not null default true,
  sort_order      int not null default 100
);

insert into notification_types (category, label, description, default_roles, default_enabled, sort_order) values
  ('run_planned',          'Run planned',
   'A new run has been added to a job file.',
   array['admin','planner','supervisor']::user_role[], true, 10),

  ('run_started',          'Run started',
   'A run has gone on the press.',
   array['admin','planner','supervisor','qc']::user_role[], true, 20),

  ('run_completed',        'Run completed',
   'A run has come off the press, with its waste figure.',
   array['admin','planner','supervisor','qc','viewer']::user_role[], true, 30),

  ('run_aborted',          'Run aborted',
   'A run was stopped before it finished.',
   array['admin','planner','supervisor','qc']::user_role[], true, 40),

  ('run_locked',           'Run locked',
   'A run has been locked and can no longer be edited on the floor.',
   array['admin','supervisor']::user_role[], true, 50),

  ('observation_raised',   'Issue logged',
   'Someone recorded an issue against a run or a job.',
   array['admin','planner','supervisor','qc']::user_role[], true, 60),

  ('observation_critical', 'Critical issue',
   'A critical issue was logged. This one is worth interrupting for.',
   array['admin','planner','supervisor','qc','operator']::user_role[], true, 70),

  ('next_run_note',        'Note for the next run',
   'An issue was flagged to carry forward into the next run of this job.',
   array['admin','planner','supervisor','qc']::user_role[], true, 80),

  ('cylinder_wear',        'Cylinder near its life limit',
   'A cylinder has passed 80% or 100% of its engraved surface life.',
   array['admin','planner','supervisor']::user_role[], true, 90),

  ('cylinder_condition',   'Cylinder condition changed',
   'A cylinder was marked worn or damaged.',
   array['admin','planner','supervisor']::user_role[], true, 100),

  ('job_created',          'Job file created',
   'A new job file has been opened.',
   array['admin','planner','supervisor']::user_role[], true, 110),

  ('job_status',           'Job status changed',
   'A job file was put on hold, completed or archived.',
   array['admin','planner','supervisor','qc']::user_role[], true, 120),

  ('artwork_revision',     'New artwork revision',
   'A revision was added to a job file.',
   array['admin','planner','supervisor','qc']::user_role[], true, 130),

  ('artwork_approval',     'Artwork approval changed',
   'The customer approved or rejected a revision.',
   array['admin','planner','supervisor','qc']::user_role[], true, 140),

  ('user_changed',         'Account changed',
   'Someone''s role or access was changed.',
   array['admin']::user_role[], true, 150),

  ('broadcast',            'Announcement',
   'A message sent to you by an administrator.',
   array['admin','planner','supervisor','operator','qc','viewer']::user_role[], true, 160)
on conflict (category) do update
  set label = excluded.label,
      description = excluded.description,
      default_roles = excluded.default_roles,
      sort_order = excluded.sort_order;


-- -----------------------------------------------------------------------------
-- 2. Per-person overrides
--
-- Absent row means "use the default". Only a deliberate change is stored, so
-- widening a default later reaches everyone who never expressed a preference.
-- -----------------------------------------------------------------------------

create table notification_prefs (
  user_id  uuid not null references profiles(id) on delete cascade,
  category notification_category not null,
  enabled  boolean not null default true,
  primary key (user_id, category)
);


-- -----------------------------------------------------------------------------
-- 3. The notifications themselves
-- -----------------------------------------------------------------------------

create table notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  category     notification_category not null,
  severity     notification_severity not null default 'info',
  title        text not null,
  body         text,
  -- Where the notification takes you. A notification you cannot act on from
  -- is a distraction, so every raiser below sets this.
  link_path    text,
  entity_type  text,
  entity_id    uuid,
  actor_id     uuid references profiles(id) on delete set null,
  actor_name   text,
  -- Collapses repeats. "Cylinder C-104 has passed 80% of its life" is true on
  -- every run after the first, and saying it on every run trains people to
  -- ignore the bell.
  dedupe_key   text,
  created_at   timestamptz not null default now(),
  read_at      timestamptz,
  archived_at  timestamptz
);

create index notifications_inbox_idx on notifications (recipient_id, created_at desc);
create index notifications_unread_idx on notifications (recipient_id)
  where read_at is null and archived_at is null;
create unique index notifications_dedupe_idx on notifications (recipient_id, dedupe_key)
  where dedupe_key is not null;
create index notifications_entity_idx on notifications (entity_type, entity_id);


-- -----------------------------------------------------------------------------
-- 4. Policies
--
-- Your notifications are yours. Nobody reads another person's inbox -- not an
-- admin, not a supervisor -- because an inbox is a record of what someone was
-- told and when, and no role in the permission matrix has a reason to hold
-- that. The super admin passes through fn_is_superadmin() as everywhere else.
--
-- There is no INSERT policy at all. Every raiser is a security definer
-- function, so nobody can post a notification to somebody else's inbox by
-- calling PostgREST directly.
-- -----------------------------------------------------------------------------

alter table notifications      enable row level security;
alter table notification_prefs enable row level security;
alter table notification_types enable row level security;

create policy "own inbox read" on notifications
  for select to authenticated
  using (recipient_id = auth.uid() or fn_is_superadmin());

create policy "own inbox update" on notifications
  for update to authenticated
  using      (recipient_id = auth.uid() or fn_is_superadmin())
  with check (recipient_id = auth.uid() or fn_is_superadmin());

create policy "own inbox delete" on notifications
  for delete to authenticated
  using (recipient_id = auth.uid() or fn_is_superadmin());

create policy "own prefs read" on notification_prefs
  for select to authenticated using (user_id = auth.uid() or fn_is_superadmin());
create policy "own prefs insert" on notification_prefs
  for insert to authenticated with check (user_id = auth.uid() or fn_is_superadmin());
create policy "own prefs update" on notification_prefs
  for update to authenticated
  using (user_id = auth.uid() or fn_is_superadmin())
  with check (user_id = auth.uid() or fn_is_superadmin());
create policy "own prefs delete" on notification_prefs
  for delete to authenticated using (user_id = auth.uid() or fn_is_superadmin());

create policy "types read all" on notification_types
  for select to authenticated using (fn_is_authed());
create policy "types admin write" on notification_types
  for update to authenticated
  using (fn_role_in('admin')) with check (fn_role_in('admin'));


-- -----------------------------------------------------------------------------
-- 5. Fan-out
--
-- One function every raiser goes through. It resolves the audience, drops the
-- actor, drops anyone who has turned the category off, drops hidden accounts,
-- and collapses duplicates.
-- -----------------------------------------------------------------------------

create or replace function fn_notify(
  p_category    notification_category,
  p_title       text,
  p_body        text                  default null,
  p_severity    notification_severity default 'info',
  p_link        text                  default null,
  p_entity_type text                  default null,
  p_entity_id   uuid                  default null,
  p_roles       user_role[]           default null,
  p_user_ids    uuid[]                default null,
  p_dedupe      text                  default null,
  p_actor       uuid                  default null
) returns int
language plpgsql security definer set search_path = public, private as $fn$
declare
  v_actor  uuid := coalesce(p_actor, auth.uid());
  v_roles  user_role[];
  v_name   text;
  v_count  int;
begin
  select coalesce(p_roles, nt.default_roles) into v_roles
    from notification_types nt where nt.category = p_category;

  -- An unknown category means a raiser was added without a catalogue row.
  -- Silently sending to nobody would hide that, so fall back to the roles that
  -- can act on anything at all.
  if v_roles is null then
    v_roles := array['admin','planner','supervisor']::user_role[];
  end if;

  select full_name into v_name from profiles where id = v_actor;

  with audience as (
    select p.id
      from profiles p
      left join notification_prefs np
        on np.user_id = p.id and np.category = p_category
      left join notification_types nt
        on nt.category = p_category
     where p.is_active
       -- The hidden account is not in anyone's org chart, and putting it in a
       -- role fan-out would give it an inbox that fills up with rows another
       -- super admin could read. It has the activity log instead.
       and not fn_is_hidden(p.id)
       -- You are not told about your own action. This is the single biggest
       -- determinant of whether people keep the bell switched on.
       and (v_actor is null or p.id <> v_actor)
       and (p.role = any(v_roles) or p.id = any(coalesce(p_user_ids, '{}'::uuid[])))
       and coalesce(np.enabled, nt.default_enabled, true)
  )
  insert into notifications (
    recipient_id, category, severity, title, body, link_path,
    entity_type, entity_id, actor_id, actor_name, dedupe_key)
  select a.id, p_category, p_severity, p_title, p_body, p_link,
         p_entity_type, p_entity_id, v_actor, v_name, p_dedupe
    from audience a
  on conflict (recipient_id, dedupe_key) where dedupe_key is not null do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$fn$;

-- Not granted to authenticated: the triggers below call it as the definer, and
-- an arbitrary caller able to write into other people's inboxes is a phishing
-- primitive. Announcements go through fn_broadcast_notification, which checks
-- the caller's role.
revoke all on function fn_notify(notification_category, text, text, notification_severity,
  text, text, uuid, user_role[], uuid[], text, uuid) from public, anon, authenticated;


-- -----------------------------------------------------------------------------
-- 6. Raisers
-- -----------------------------------------------------------------------------

-- Runs. Status transitions, the lock, and the wear check that only makes sense
-- once the meters for a run are final.
create or replace function fn_notify_run()
returns trigger language plpgsql security definer set search_path = public, private as $fn$
declare
  v_job     text;
  v_machine text;
  v_where   text;
  v_link    text;
  v_cyl     record;
  v_bucket  text;
begin
  select jf.job_no into v_job from job_files jf where jf.id = NEW.job_file_id;
  select m.code into v_machine from machines m where m.id = NEW.machine_id;
  v_where := format('%s, run %s on %s', coalesce(v_job, 'job'), NEW.run_no, coalesce(v_machine, 'a machine'));
  v_link  := '/runs/' || NEW.id;

  if TG_OP = 'INSERT' then
    perform fn_notify('run_planned', format('Run %s planned', NEW.run_no),
      format('%s is planned for %s.', v_where, to_char(NEW.run_date, 'DD Mon YYYY')),
      'info', v_link, 'run', NEW.id);
    return NEW;
  end if;

  if NEW.status is distinct from OLD.status then
    if NEW.status = 'running' then
      perform fn_notify('run_started', format('Run %s is on the press', NEW.run_no),
        format('%s has started.', v_where), 'info', v_link, 'run', NEW.id);

    elsif NEW.status = 'completed' then
      perform fn_notify('run_completed', format('Run %s completed', NEW.run_no),
        format('%s finished%s%s.', v_where,
          case when NEW.produced_qty_m is not null
               then format(' with %s m produced', round(NEW.produced_qty_m)) else '' end,
          case when NEW.waste_pct_m is not null
               then format(' at %s%% waste', round(NEW.waste_pct_m, 1)) else '' end),
        case when coalesce(NEW.waste_pct_m, 0) > 10 then 'warning' else 'success' end,
        v_link, 'run', NEW.id);

      -- Wear is checked here rather than on every station write. The meters
      -- for a run are only final when the run is, and a cylinder that crosses
      -- 80% mid-run is not coming off the press before the reel ends anyway.
      for v_cyl in
        select distinct cs.id, cs.cylinder_no, cs.colour_name, cs.life_used_pct
          from run_stations rs
          join v_cylinder_summary cs on cs.id = rs.cylinder_id
         where rs.run_id = NEW.id and coalesce(cs.life_used_pct, 0) >= 80
      loop
        v_bucket := case when v_cyl.life_used_pct >= 100 then 'over' else '80' end;
        perform fn_notify('cylinder_wear',
          format('Cylinder %s is at %s%% of its life', v_cyl.cylinder_no, round(v_cyl.life_used_pct)),
          format('%s%s passed %s of its engraved surface life on %s. Plan a re-engrave before it is scheduled again.',
                 v_cyl.cylinder_no,
                 case when v_cyl.colour_name is not null then ' (' || v_cyl.colour_name || ')' else '' end,
                 case when v_bucket = 'over' then 'all' else '80%' end,
                 v_where),
          case when v_bucket = 'over' then 'critical' else 'warning' end,
          '/cylinders/' || v_cyl.id, 'cylinder', v_cyl.id,
          null::user_role[], null::uuid[], format('wear:%s:%s', v_cyl.id, v_bucket));
      end loop;

    elsif NEW.status = 'aborted' then
      perform fn_notify('run_aborted', format('Run %s aborted', NEW.run_no),
        format('%s was stopped before it finished.%s', v_where,
               case when NEW.remarks is not null then ' ' || NEW.remarks else '' end),
        'critical', v_link, 'run', NEW.id);
    end if;
  end if;

  if NEW.locked_at is not null and OLD.locked_at is null then
    perform fn_notify('run_locked', format('Run %s locked', NEW.run_no),
      format('%s can no longer be edited on the floor.', v_where),
      'info', v_link, 'run', NEW.id);
  end if;

  return NEW;
end;
$fn$;

create trigger tr_notify_run
  after insert or update on runs
  for each row execute function fn_notify_run();


-- Observations. Severity decides both the category and how loud it is.
create or replace function fn_notify_observation()
returns trigger language plpgsql security definer set search_path = public, private as $fn$
declare
  v_job  text;
  v_link text;
  v_run  int;
begin
  select jf.job_no into v_job from job_files jf where jf.id = NEW.job_file_id;
  if NEW.run_id is not null then
    select r.run_no into v_run from runs r where r.id = NEW.run_id;
    v_link := '/runs/' || NEW.run_id;
  else
    v_link := '/jobs/' || NEW.job_file_id || '/issues';
  end if;

  if NEW.severity = 'critical' then
    perform fn_notify('observation_critical',
      format('Critical: %s', NEW.title),
      format('%s%s — %s', coalesce(v_job, 'A job'),
             case when v_run is not null then format(', run %s', v_run) else '' end,
             NEW.description),
      'critical', v_link, 'observation', NEW.id);
  else
    perform fn_notify('observation_raised',
      format('%s issue: %s', initcap(NEW.severity::text), NEW.title),
      format('%s%s — %s', coalesce(v_job, 'A job'),
             case when v_run is not null then format(', run %s', v_run) else '' end,
             NEW.description),
      case when NEW.severity = 'major' then 'warning' else 'info' end,
      v_link, 'observation', NEW.id);
  end if;

  -- A note that has to reach whoever briefs the next run is a different event
  -- from the issue itself, and the people who need it are not always the same.
  if NEW.next_run_note is not null then
    perform fn_notify('next_run_note',
      format('Carry forward on %s', coalesce(v_job, 'a job')),
      NEW.next_run_note, 'warning',
      '/jobs/' || NEW.job_file_id || '/briefing', 'job_file', NEW.job_file_id);
  end if;

  return NEW;
end;
$fn$;

create trigger tr_notify_observation
  after insert on observations
  for each row execute function fn_notify_observation();


-- Cylinders. Condition only; wear is raised from the run, above.
create or replace function fn_notify_cylinder()
returns trigger language plpgsql security definer set search_path = public, private as $fn$
begin
  if NEW.condition is distinct from OLD.condition
     and NEW.condition in ('worn', 'damaged') then
    perform fn_notify('cylinder_condition',
      format('Cylinder %s marked %s', NEW.cylinder_no, NEW.condition),
      format('Was %s. %s', OLD.condition,
             case when NEW.condition = 'damaged'
                  then 'It should not be scheduled until it has been inspected.'
                  else 'Check it before the next job that needs it.' end),
      case when NEW.condition = 'damaged' then 'critical' else 'warning' end,
      '/cylinders/' || NEW.id, 'cylinder', NEW.id);
  end if;
  return NEW;
end;
$fn$;

create trigger tr_notify_cylinder
  after update on cylinders
  for each row execute function fn_notify_cylinder();


-- Job files.
create or replace function fn_notify_job()
returns trigger language plpgsql security definer set search_path = public, private as $fn$
declare v_customer text;
begin
  select c.name into v_customer from customers c where c.id = NEW.customer_id;

  if TG_OP = 'INSERT' then
    perform fn_notify('job_created',
      format('Job file %s opened', NEW.job_no),
      format('%s for %s — %s.', NEW.product_name, coalesce(v_customer, 'a customer'), NEW.structure),
      'info', '/jobs/' || NEW.id, 'job_file', NEW.id);

  elsif NEW.status is distinct from OLD.status then
    perform fn_notify('job_status',
      format('Job %s is now %s', NEW.job_no, replace(NEW.status::text, '_', ' ')),
      format('%s for %s was %s.', NEW.product_name, coalesce(v_customer, 'a customer'),
             replace(NEW.status::text, '_', ' ')),
      case when NEW.status = 'on_hold' then 'warning' else 'info' end,
      '/jobs/' || NEW.id, 'job_file', NEW.id);
  end if;

  return NEW;
end;
$fn$;

create trigger tr_notify_job
  after insert or update on job_files
  for each row execute function fn_notify_job();


-- Artwork revisions. A revision landing and a customer decision are different
-- events to different people, so they are separate categories.
create or replace function fn_notify_artwork()
returns trigger language plpgsql security definer set search_path = public, private as $fn$
declare v_job text;
begin
  select jf.job_no into v_job from job_files jf where jf.id = NEW.job_file_id;

  if TG_OP = 'INSERT' then
    perform fn_notify('artwork_revision',
      format('%s added to %s', NEW.revision_label, coalesce(v_job, 'a job')),
      NEW.change_summary, 'info',
      '/jobs/' || NEW.job_file_id || '/artwork', 'artwork_revision', NEW.id);

  elsif NEW.customer_approval is distinct from OLD.customer_approval then
    perform fn_notify('artwork_approval',
      format('%s %s on %s', NEW.revision_label, NEW.customer_approval, coalesce(v_job, 'a job')),
      case when NEW.customer_approval = 'approved'
           then 'This revision may now be printed.'
           else 'This revision must not be printed. Check with the planner before scheduling.' end,
      case when NEW.customer_approval = 'approved' then 'success' else 'critical' end,
      '/jobs/' || NEW.job_file_id || '/artwork', 'artwork_revision', NEW.id);
  end if;

  return NEW;
end;
$fn$;

create trigger tr_notify_artwork
  after insert or update on artwork_revisions
  for each row execute function fn_notify_artwork();


-- Accounts. Admins hear about role and access changes; the person affected
-- always hears about their own, which is the one case where notifying about a
-- change you did not make is not enough.
create or replace function fn_notify_profile()
returns trigger language plpgsql security definer set search_path = public, private as $fn$
begin
  if fn_is_hidden(NEW.id) then
    return NEW;
  end if;

  if NEW.role is distinct from OLD.role then
    perform fn_notify('user_changed',
      format('%s is now %s', NEW.full_name, upper(NEW.role::text)),
      format('Role changed from %s.', OLD.role),
      'info', '/settings/users', 'profile', NEW.id,
      null::user_role[], array[NEW.id]);

  elsif NEW.is_active is distinct from OLD.is_active then
    perform fn_notify('user_changed',
      format('%s was %s', NEW.full_name,
             case when NEW.is_active then 'reactivated' else 'deactivated' end),
      case when NEW.is_active then 'They can sign in again.'
           else 'They can no longer sign in.' end,
      case when NEW.is_active then 'info' else 'warning' end,
      '/settings/users', 'profile', NEW.id);
  end if;

  return NEW;
end;
$fn$;

create trigger tr_notify_profile
  after update on profiles
  for each row execute function fn_notify_profile();


-- -----------------------------------------------------------------------------
-- 7. Announcements
--
-- The one path that lets a person, rather than an event, put something in
-- somebody's inbox. Admin and super admin only, and it records who sent it.
-- -----------------------------------------------------------------------------

create or replace function fn_broadcast_notification(
  p_title    text,
  p_body     text,
  p_roles    user_role[]           default null,
  p_severity notification_severity default 'info',
  p_link     text                  default null
) returns int
language plpgsql security definer set search_path = public, private as $fn$
declare v_sent int;
begin
  if not fn_role_in('admin') then
    raise exception 'Only an administrator can send an announcement.' using errcode = '42501';
  end if;
  if coalesce(trim(p_title), '') = '' then
    raise exception 'An announcement needs a title.' using errcode = 'P0001';
  end if;

  v_sent := fn_notify('broadcast', trim(p_title), nullif(trim(p_body), ''),
                      coalesce(p_severity, 'info'), nullif(trim(p_link), ''),
                      'broadcast', null::uuid, p_roles);

  insert into private.activity_log (
    actor_id, actor_hidden, category, event, summary, target_type, meta)
  select auth.uid(), fn_is_hidden(auth.uid()), 'admin', 'admin.broadcast',
         trim(p_title), 'notification',
         jsonb_build_object('recipients', v_sent, 'roles', p_roles, 'severity', p_severity);

  return v_sent;
end;
$fn$;

grant execute on function fn_broadcast_notification(text, text, user_role[], notification_severity, text)
  to authenticated;


-- -----------------------------------------------------------------------------
-- 8. Inbox operations
--
-- Marking read is an ordinary UPDATE through RLS from the client. These two
-- exist because "mark all read" and "clear read" as PostgREST calls would each
-- need a filter the client could get wrong in the direction of touching
-- somebody else's rows; here the predicate is not the caller's to supply.
-- -----------------------------------------------------------------------------

create or replace function fn_mark_all_notifications_read() returns int
language plpgsql security definer set search_path = public as $fn$
declare v_n int;
begin
  if auth.uid() is null then return 0; end if;
  update notifications set read_at = now()
   where recipient_id = auth.uid() and read_at is null and archived_at is null;
  get diagnostics v_n = row_count;
  return v_n;
end;
$fn$;

create or replace function fn_archive_read_notifications() returns int
language plpgsql security definer set search_path = public as $fn$
declare v_n int;
begin
  if auth.uid() is null then return 0; end if;
  update notifications set archived_at = now()
   where recipient_id = auth.uid() and read_at is not null and archived_at is null;
  get diagnostics v_n = row_count;
  return v_n;
end;
$fn$;

grant execute on function fn_mark_all_notifications_read() to authenticated;
grant execute on function fn_archive_read_notifications()  to authenticated;


-- -----------------------------------------------------------------------------
-- 9. Live delivery
--
-- Postgres Changes applies RLS per subscriber, and the policy above is
-- `recipient_id = auth.uid()`, so a client subscribed to this table is told
-- about its own rows and nobody else's. That is the whole delivery mechanism:
-- no queue, no worker, no second connection.
--
-- REPLICA IDENTITY stays DEFAULT, for the reasons set out at length in
-- 20260823160000. The client uses the event as a signal to refetch its own
-- inbox, never as the payload.
-- -----------------------------------------------------------------------------

do $do$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public'
       and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$do$;
