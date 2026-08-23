-- =============================================================================
-- Make renaming a colour safe, and make the new name reach everywhere.
--
-- `colour_names.name` is the primary key, so the label a colour is known by and
-- the key every other row points at are the same string. That is a reasonable
-- schema for a controlled vocabulary, but it means a rename is a primary-key
-- update, and right now three things stand in the way:
--
--   1. run_stations.colour_name references colour_names(name) with no ON UPDATE
--      action. Renaming a colour that any station has ever used raises a
--      foreign key violation. It happens to work today only because no run has
--      used a self colour yet -- it would start failing the day one did.
--
--   2. cylinders.colour_name and ink_products.colour_name are plain text with
--      no foreign key at all. They would keep the old name forever, so the
--      cylinder master and the ink master would silently disagree with the
--      station grid about what the colour is called.
--
--   3. Nothing stopped a typo: any string at all was accepted in those two
--      columns, which is exactly what the colour_names list exists to prevent.
--      The Settings page says "Station colours come from this list and are
--      never free text" -- for stations that was true, for cylinders and inks
--      it was not.
--
-- All three are the same fix: real foreign keys, all of them ON UPDATE CASCADE.
-- After this, renaming a colour in Settings updates every row that referenced
-- it, in one statement, atomically.
--
-- ON DELETE is left to fail rather than cascade. Deleting a colour still in use
-- should be refused, not silently blank out the colour on historical runs.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Anything already recorded under a name that is not in the list.
--
-- A foreign key cannot be added while a row violates it, and a migration that
-- aborts on real data is worse than one that reports what it found. Any stray
-- value is adopted into the list as retired: visible in Settings as "Retired",
-- out of the dropdowns, and safe to merge or rename by hand afterwards.
-- -----------------------------------------------------------------------------

do $$
declare
  adopted text[];
begin
  with strays as (
    select distinct colour_name from cylinders
    where colour_name is not null
      and colour_name not in (select name from colour_names)
    union
    select distinct colour_name from ink_products
    where colour_name is not null
      and colour_name not in (select name from colour_names)
  ),
  inserted as (
    insert into colour_names (name, sort_order, is_active)
    select colour_name, 900, false from strays
    returning name
  )
  select array_agg(name) into adopted from inserted;

  if adopted is not null then
    raise notice 'Adopted % colour name(s) already in use but missing from the list, as retired: %',
      array_length(adopted, 1), adopted;
  end if;
end $$;


-- -----------------------------------------------------------------------------
-- 2. run_stations -- replace the existing key with a cascading one.
-- -----------------------------------------------------------------------------

do $$
declare
  fk text;
begin
  select conname into fk
  from pg_constraint
  where conrelid = 'public.run_stations'::regclass
    and confrelid = 'public.colour_names'::regclass
    and contype = 'f';

  if fk is not null then
    execute format('alter table run_stations drop constraint %I', fk);
  end if;
end $$;

alter table run_stations
  add constraint run_stations_colour_name_fkey
  foreign key (colour_name) references colour_names(name)
  on update cascade on delete restrict;


-- -----------------------------------------------------------------------------
-- 3. cylinders and ink_products -- give them the same guarantee.
-- -----------------------------------------------------------------------------

alter table cylinders
  drop constraint if exists cylinders_colour_name_fkey;
alter table cylinders
  add constraint cylinders_colour_name_fkey
  foreign key (colour_name) references colour_names(name)
  on update cascade on delete restrict;

alter table ink_products
  drop constraint if exists ink_products_colour_name_fkey;
alter table ink_products
  add constraint ink_products_colour_name_fkey
  foreign key (colour_name) references colour_names(name)
  on update cascade on delete restrict;

-- The referencing side of a cascade is scanned on every parent update, and
-- these three columns had no index of their own.
create index if not exists run_stations_colour_name_idx on run_stations (colour_name);
create index if not exists cylinders_colour_name_idx    on cylinders (colour_name);
create index if not exists ink_products_colour_name_idx on ink_products (colour_name);


comment on column colour_names.name is
  'Primary key and display label. Renaming cascades to run_stations, cylinders '
  'and ink_products. Delete is refused while any row still references it.';
