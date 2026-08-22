-- Create a test admin user (Password: password123)
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'admin@gravuretrace.local',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Admin User"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- Update the auto-created profile to be admin
update public.profiles
set role = 'admin'
where id = 'a0000000-0000-0000-0000-000000000001';

-- Create a machine account user (Password: machine123)
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  'b0000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'g01@gravuretrace.local',
  crypt('machine123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Machine G-01 Account"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- Update the auto-created profile to be operator
update public.profiles
set role = 'operator'
where id = 'b0000000-0000-0000-0000-000000000001';

-- Create a Planner user (Password: password123)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'planner@gravuretrace.local', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Planner"}', now(), now(), '', '', '', ''
);

-- Update profile to planner
update public.profiles
set role = 'planner'
where id = 'c0000000-0000-0000-0000-000000000001';

-- Create a Supervisor user (Password: password123)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'supervisor@gravuretrace.local', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Supervisor"}', now(), now(), '', '', '', ''
);

-- Update profile to supervisor
update public.profiles
set role = 'supervisor'
where id = 'd0000000-0000-0000-0000-000000000001';

-- Create a QC user (Password: password123)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000', 'e0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'qc@gravuretrace.local', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Demo QC"}', now(), now(), '', '', '', ''
);

-- Update profile to qc
update public.profiles
set role = 'qc'
where id = 'e0000000-0000-0000-0000-000000000001';

-- Create a Viewer user (Password: password123)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000', 'f0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'viewer@gravuretrace.local', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Viewer"}', now(), now(), '', '', '', ''
);

-- Update profile to viewer
update public.profiles
set role = 'viewer'
where id = 'f0000000-0000-0000-0000-000000000001';

-- Seed Machines
insert into public.machines (id, code, name, max_web_width_mm, max_speed_mpm, dryer_zones) values
  ('m1000000-0000-0000-0000-000000000001', 'G-01', 'Gravure Line 1', 1000, 250, 8),
  ('m2000000-0000-0000-0000-000000000002', 'G-02', 'Gravure Line 2', 1200, 300, 9);

-- Seed Customers
insert into public.customers (id, code, name) values
  ('c1000000-0000-0000-0000-000000000001', 'ABC', 'ABC Foods');

-- Seed Suppliers
insert into public.suppliers (id, code, name, type) values
  ('s1000000-0000-0000-0000-000000000001', 'SUP-X', 'Supplier X', '{"substrate"}'),
  ('s2000000-0000-0000-0000-000000000002', 'SUP-Y', 'Supplier Y', '{"cylinder", "ink"}');

-- Seed Cylinder Life Rules
insert into public.cylinder_life_rules (screen_lpi_min, screen_lpi_max, limit_meters, priority, notes) values
  (null, 100,  1500000, 100, 'coarse screen, deeper cells, longer life'),
  (101,  150,  1000000, 100, 'standard'),
  (151,  null,  700000, 100, 'fine screen, shallow cells, wears faster');

-- Seed Colour Names
insert into public.colour_names (name, sort_order) values
  ('Cyan', 10),
  ('Magenta', 20),
  ('Yellow', 30),
  ('Black', 40),
  ('Ground', 50),
  ('White', 60),
  ('Self Colour 1', 70),
  ('Self Colour 2', 80);

-- Seed Issue Templates
insert into public.issue_templates (area, title, hint) values
  ('registration', 'drift at high speed', 'Registration wanders when speed increases'),
  ('adhesion', 'bond drop on PET', 'Tape test fails on substrate'),
  ('doctor_blade', 'blade lines', 'Streaks appearing on printed web');
