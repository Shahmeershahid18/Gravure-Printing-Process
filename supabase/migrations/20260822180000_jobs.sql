create sequence if not exists job_file_seq start 1;

create table job_files (
  id                 uuid primary key default gen_random_uuid(),
  job_file_no        text unique not null
                       default 'JF-' || lpad(nextval('job_file_seq')::text, 4, '0'),
  job_no             text unique not null,          -- GR-2548
  customer_id        uuid not null references customers(id),
  product_name       text not null,                 -- Biscuit
  structure          text not null,                 -- PET 12 / MBOPP 20
  no_of_colours      int  not null default 8 check (no_of_colours between 1 and 8),
  default_machine_id uuid references machines(id),
  reel_width_mm      numeric(8,2),
  repeat_length_mm   numeric(8,2),
  ups                int,
  status             job_status not null default 'active',
  notes              text,
  created_by         uuid references profiles(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index on job_files using gin (job_file_no gin_trgm_ops);
create index on job_files using gin (job_no gin_trgm_ops);
create index on job_files (customer_id, status);

create table artwork_revisions (
  id                 uuid primary key default gen_random_uuid(),
  job_file_id        uuid not null references job_files(id) on delete cascade,
  revision_no        int  not null,                 -- 0,1,2,3
  revision_label     text generated always as ('Rev-' || lpad(revision_no::text,2,'0')) stored,
  revision_date      date not null,
  artwork_no         text,
  shade_card_no      text,                          -- SC-03
  change_summary     text not null,
  customer_approval  approval_status not null default 'pending',
  approved_by        text,
  approved_at        date,
  effective_from_run int,
  is_current         boolean not null default false,
  created_by         uuid references profiles(id),
  created_at         timestamptz not null default now(),
  unique (job_file_id, revision_no)
);

create unique index one_current_rev_per_job
  on artwork_revisions (job_file_id) where is_current;

create table cylinders (
  id                   uuid primary key default gen_random_uuid(),
  cylinder_no          text unique not null,          -- C-104
  colour_name          text,
  ownership            cylinder_ownership not null default 'company',
  owned_by_customer_id uuid references customers(id),
  engraver_supplier_id uuid references suppliers(id),
  base_no              text,
  circumference_mm     numeric(8,2),
  face_width_mm        numeric(8,2),
  screen_lpi           int,
  stylus_angle         numeric(5,2),
  cell_depth_micron    numeric(6,2),
  engraving_date       date,
  status               cylinder_status not null default 'in_store',
  condition            cylinder_condition not null default 'new',
  opening_meters       bigint not null default 0,      
  life_limit_override  bigint,                         
  location             text,
  notes                text,
  created_at           timestamptz not null default now(),
  constraint customer_owned_needs_customer
    check (ownership = 'company' or owned_by_customer_id is not null)
);

create table cylinder_events (
  id              uuid primary key default gen_random_uuid(),
  cylinder_id     uuid not null references cylinders(id) on delete cascade,
  event_type      cyl_event_type not null,
  event_date      date not null,
  meters_at_event bigint,
  supplier_id     uuid references suppliers(id),
  customer_id     uuid references customers(id),   -- for issue/receive to customer
  cost            numeric(12,2),
  currency        text default 'PKR',
  description     text,
  performed_by    uuid references profiles(id),
  created_at      timestamptz not null default now()
);

create index on cylinder_events (cylinder_id, event_date desc);
create index on cylinders (ownership, status);

create table artwork_revision_cylinders (
  id          uuid primary key default gen_random_uuid(),
  revision_id uuid not null references artwork_revisions(id) on delete cascade,
  station_no  int not null check (station_no between 1 and 8),
  cylinder_id uuid references cylinders(id),
  action      text not null,          -- new | re_engraved | unchanged | removed
  remarks     text,
  unique (revision_id, station_no)
);


