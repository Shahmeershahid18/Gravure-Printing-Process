create table customers (
  id            uuid primary key default gen_random_uuid(),
  code          text unique not null,
  name          text not null,
  contact_name  text,
  contact_email text,
  notes         text,
  created_at    timestamptz not null default now()
);

create table machines (
  id               uuid primary key default gen_random_uuid(),
  code             text unique not null,          -- G-02
  name             text,
  stations         int not null default 8 check (stations = 8),
  max_web_width_mm int,
  max_speed_mpm    int,
  dryer_zones      int,
  is_active        boolean not null default true
);

alter table profiles
  add constraint profiles_machine_fk
  foreign key (default_machine_id) references machines(id);

create table suppliers (
  id    uuid primary key default gen_random_uuid(),
  code  text unique not null,
  name  text not null,
  type  text[] not null default '{}',       -- {substrate, ink, cylinder, solvent}
  notes text
);

-- life limits vary, so they are rules not constants
create table cylinder_life_rules (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid references customers(id),      -- null = applies to all customers
  screen_lpi_min  int,
  screen_lpi_max  int,
  limit_meters    bigint not null,
  priority        int not null default 100,           -- lower wins
  notes           text
);

create table substrate_batches (
  id                      uuid primary key default gen_random_uuid(),
  supplier_id             uuid not null references suppliers(id),
  material_type           text not null,             -- PET, BOPP, MBOPP, CPP, PE, Paper
  grade                   text,
  thickness_micron        numeric(6,2) not null,
  width_mm                numeric(8,2),
  batch_no                text not null,
  lot_no                  text,
  treatment_dyne_supplier numeric(5,2),
  gsm                     numeric(8,2),
  received_date           date,
  qty_kg                  numeric(12,3),
  coa_url                 text,
  remarks                 text,
  unique (supplier_id, batch_no, thickness_micron)
);

create table ink_products (
  id             uuid primary key default gen_random_uuid(),
  ink_code       text unique not null,             -- IK-CY-001
  colour_name    text not null,
  is_self_colour boolean not null default false,
  pantone_ref    text,
  ink_system     ink_system not null,
  technology     text,                             -- surface print / reverse print grade
  supplier_id    uuid references suppliers(id),
  base_formula   jsonb,                            -- {"base_blue":60,"extender":30,"varnish":10}
  notes          text
);

create table ink_batches (
  id             uuid primary key default gen_random_uuid(),
  ink_product_id uuid not null references ink_products(id),
  batch_no       text not null,
  mfg_date       date,
  received_date  date,
  qty_kg         numeric(12,3),
  supplier_lot   text,
  remarks        text,
  unique (ink_product_id, batch_no)
);

-- colour names come from a master list, never free text
create table colour_names (
  name       text primary key,          -- Cyan, Magenta, Yellow, Black, Ground, White, Self Colour 1...
  sort_order int not null default 100,
  is_active  boolean not null default true
);

-- a short library of common issue titles so operators pick instead of typing
create table issue_templates (
  id       uuid primary key default gen_random_uuid(),
  area     issue_area not null,
  title    text not null,
  hint     text,
  is_active boolean not null default true,
  unique (area, title)
);
