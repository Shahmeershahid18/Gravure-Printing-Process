create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

create type job_status         as enum ('active','on_hold','completed','archived');
create type run_status         as enum ('planned','setup','running','completed','aborted');
create type run_result         as enum ('ok','ok_with_issues','rejected','rerun_required');
create type approval_status    as enum ('pending','approved','rejected');
create type cylinder_ownership as enum ('company','customer');
create type cylinder_status    as enum ('in_store','on_machine','at_engraver','under_repair','with_customer','scrapped');
create type cylinder_condition as enum ('new','good','fair','worn','damaged');
create type cyl_event_type     as enum ('engraved','chrome_plated','dechromed','re_engraved','cleaning','repair','inspection','issued_to_customer','received_from_customer','scrapped');
create type issue_area         as enum ('cylinder','ink','substrate','machine','registration','drying','tension','static','adhesion','doctor_blade','other');
create type issue_severity     as enum ('minor','major','critical');
create type ink_system         as enum ('nc','pu','nc_pu','water_based','solvent_other');
create type user_role          as enum ('admin','planner','supervisor','operator','qc','viewer');

create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null,
  employee_no  text unique,
  role         user_role not null default 'viewer',
  pin_hash     text,
  default_machine_id uuid,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'viewer');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function fn_verify_operator_pin(p_profile_id uuid, p_pin text)
returns boolean language sql security definer as $$
  select exists (
    select 1 from profiles
     where id = p_profile_id and is_active
       and pin_hash = crypt(p_pin, pin_hash));
$$;

create or replace function fn_my_role() returns user_role
language sql stable security definer as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function fn_my_machine() returns uuid
language sql stable security definer as $$
  select default_machine_id from profiles where id = auth.uid();
$$;
