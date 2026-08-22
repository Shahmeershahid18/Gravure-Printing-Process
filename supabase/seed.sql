-- Create a test admin user (Password: password123)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin@gravuretrace.local', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Admin User"}', now(), now(), '', '', '', ''
) on conflict (id) do nothing;

update public.profiles set role = 'admin' where id = 'a0000000-0000-0000-0000-000000000001';

-- Create a machine account user (Password: machine123)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'g01@gravuretrace.local', crypt('machine123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Machine G-01 Account"}', now(), now(), '', '', '', ''
) on conflict (id) do nothing;

update public.profiles set role = 'operator' where id = 'b0000000-0000-0000-0000-000000000001';

-- Create a Planner user
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'planner@gravuretrace.local', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Planner"}', now(), now(), '', '', '', ''
) on conflict (id) do nothing;

update public.profiles set role = 'planner' where id = 'c0000000-0000-0000-0000-000000000001';

-- Create a Supervisor user
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'supervisor@gravuretrace.local', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Supervisor"}', now(), now(), '', '', '', ''
) on conflict (id) do nothing;

update public.profiles set role = 'supervisor' where id = 'd0000000-0000-0000-0000-000000000001';

-- Create a QC user
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000', 'e0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'qc@gravuretrace.local', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Demo QC"}', now(), now(), '', '', '', ''
) on conflict (id) do nothing;

update public.profiles set role = 'qc' where id = 'e0000000-0000-0000-0000-000000000001';

-- Create a Viewer user
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000', 'f0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'viewer@gravuretrace.local', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Viewer"}', now(), now(), '', '', '', ''
) on conflict (id) do nothing;

update public.profiles set role = 'viewer' where id = 'f0000000-0000-0000-0000-000000000001';

-- Seed Machines
insert into public.machines (id, code, name, max_web_width_mm, max_speed_mpm, dryer_zones) values
  ('11111111-0000-0000-0000-000000000001', 'G-01', 'Gravure Line 1', 1000, 250, 8),
  ('11111111-0000-0000-0000-000000000002', 'G-02', 'Gravure Line 2', 1200, 300, 9)
on conflict (id) do nothing;

-- Seed Customers
insert into public.customers (id, code, name) values
  ('22222222-0000-0000-0000-000000000001', 'ABC', 'ABC Foods')
on conflict (id) do nothing;

-- Seed Suppliers
insert into public.suppliers (id, code, name, type) values
  ('33333333-0000-0000-0000-000000000001', 'SUP-X', 'Supplier X', '{"substrate"}'),
  ('33333333-0000-0000-0000-000000000002', 'SUP-Y', 'Supplier Y', '{"cylinder", "ink"}')
on conflict (id) do nothing;

-- Seed Cylinder Life Rules
insert into public.cylinder_life_rules (id, screen_lpi_min, screen_lpi_max, limit_meters, priority, notes) values
  ('44444444-0000-0000-0000-000000000001', null, 100,  1500000, 100, 'coarse screen, deeper cells, longer life'),
  ('44444444-0000-0000-0000-000000000002', 101,  150,  1000000, 100, 'standard'),
  ('44444444-0000-0000-0000-000000000003', 151,  null,  700000, 100, 'fine screen, shallow cells, wears faster')
on conflict (id) do nothing;

-- Seed Colour Names
insert into public.colour_names (name, sort_order) values
  ('Cyan', 10),
  ('Magenta', 20),
  ('Yellow', 30),
  ('Black', 40),
  ('Ground', 50),
  ('White', 60),
  ('Self Colour 1', 70),
  ('Self Colour 2', 80)
on conflict (name) do nothing;

-- Seed Issue Templates
insert into public.issue_templates (area, title, hint) values
  ('registration', 'drift at high speed', 'Registration wanders when speed increases'),
  ('adhesion', 'bond drop on PET', 'Tape test fails on substrate'),
  ('doctor_blade', 'blade lines', 'Streaks appearing on printed web')
on conflict (area, title) do nothing;

-- Phase 2 Seed Data
insert into storage.buckets (id, name, public) values ('artworks', 'artworks', false) on conflict do nothing;

insert into public.job_files (id, job_file_no, job_no, customer_id, product_name, structure, no_of_colours, status)
values (
  '55555555-0000-0000-0000-000000000001',
  'JF-0001',
  'GR-2548',
  '22222222-0000-0000-0000-000000000001',
  'Biscuit',
  'PET 12 / MBOPP 20',
  8,
  'active'
) on conflict (id) do nothing;

insert into public.artwork_revisions (id, job_file_id, revision_no, revision_date, change_summary, is_current)
values (
  '66666666-0000-0000-0000-000000000000',
  '55555555-0000-0000-0000-000000000001',
  0,
  '2026-01-01',
  'Initial Artwork',
  false
) on conflict (id) do nothing;

insert into public.artwork_revisions (id, job_file_id, revision_no, revision_date, change_summary, is_current)
values (
  '66666666-0000-0000-0000-000000000001',
  '55555555-0000-0000-0000-000000000001',
  1,
  '2026-02-15',
  'Corrected barcode',
  false
) on conflict (id) do nothing;

insert into public.artwork_revisions (id, job_file_id, revision_no, revision_date, change_summary, is_current)
values (
  '66666666-0000-0000-0000-000000000002',
  '55555555-0000-0000-0000-000000000001',
  2,
  '2026-04-10',
  'Updated ingredient list',
  false
) on conflict (id) do nothing;

insert into public.artwork_revisions (id, job_file_id, revision_no, revision_date, shade_card_no, change_summary, is_current)
values (
  '66666666-0000-0000-0000-000000000003',
  '55555555-0000-0000-0000-000000000001',
  3,
  '2026-06-20',
  'SC-03',
  'Changed red pantone',
  true
) on conflict (id) do nothing;

-- Phase 3 Seed Data (Cylinders)
insert into public.cylinder_life_rules (id, screen_lpi_min, screen_lpi_max, limit_meters, priority, notes)
values
  ('88888888-0000-0000-0000-000000000001', 0, 100, 1500000, 100, 'Standard low lpi'),
  ('88888888-0000-0000-0000-000000000002', 101, 150, 1000000, 100, 'Standard mid lpi'),
  ('88888888-0000-0000-0000-000000000003', 151, 999, 800000, 100, 'Standard high lpi')
on conflict (id) do nothing;

insert into public.cylinders (id, cylinder_no, colour_name, ownership, owned_by_customer_id, engraver_supplier_id, base_no, circumference_mm, face_width_mm, screen_lpi, stylus_angle, cell_depth_micron, engraving_date, status, condition, opening_meters)
values
  ('77777777-0000-0000-0000-000000000001', 'C-101', 'Cyan', 'company', null, '33333333-0000-0000-0000-000000000001', 'B-01', 550, 1200, 120, 130, 45, '2025-01-12', 'in_store', 'good', 310000),
  ('77777777-0000-0000-0000-000000000002', 'C-104', 'Black', 'customer', '22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'B-02', 550, 1200, 120, 130, 45, '2025-01-12', 'on_machine', 'worn', 842000),
  ('77777777-0000-0000-0000-000000000003', 'C-205', 'White', 'company', null, '33333333-0000-0000-0000-000000000001', 'B-03', 600, 1000, 80, 130, 60, '2026-03-10', 'in_store', 'new', 15000)
on conflict (id) do nothing;

insert into public.cylinder_events (id, cylinder_id, event_type, event_date, meters_at_event, description)
values
  (gen_random_uuid(), '77777777-0000-0000-0000-000000000002', 'engraved', '2025-01-12', 0, 'Initial engraving'),
  (gen_random_uuid(), '77777777-0000-0000-0000-000000000002', 'cleaning', '2026-08-02', 780000, 'in house cleaning')
;
