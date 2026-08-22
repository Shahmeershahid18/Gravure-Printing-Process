# Gravure Print Traceability System
## Build Plan v3 (Next.js + Supabase)

**Working name:** GravureTrace
**Prepared by:** Muhammad Shahmeer Shahid
**Stack:** Next.js 15 (App Router) + Supabase (Postgres, Auth, Storage, Realtime) + Tailwind + shadcn/ui
**Status:** Requirements locked, ready to scaffold
**Revision:** v3 adds the end to end walkthrough (Section 2), user roles (Section 3), the UI/UX design direction (Section 4), and the cylinder re-engrave life reset (Section 7.2). v2 folded in the ten answered questions.

**Contents**

| | |
|---|---|
| 0 | Locked decisions |
| 1 | What this system actually solves |
| 2 | **How the system works** |
| 3 | **User roles** |
| 4 | **Design direction: easy, clean, minimalist** |
| 5 | Domain model |
| 6 | Database schema |
| 7 | Views and functions |
| 8 | Auth model for shop floor operators |
| 9 | Application structure |
| 10 | The key screens |
| 11 | Build phases |
| 12 | Migration from Excel |
| 13 | Risks and mitigations |
| 14 | Non goals for v1 |
| 15 | Environment and deployment |
| 16 | Immediate next actions |

---

## 0. Locked decisions

| # | Question | Answer | Design consequence |
|---|---|---|---|
| 1 | Job File to Job No | One to one | `job_numbers` table removed. `job_no` is a column on `job_files`. One less join everywhere. |
| 2 | Job stays on one machine | No, can move | `runs.machine_id` is authoritative per run. Best-run comparison becomes machine aware. Machine change raises a briefing flag. |
| 3 | Meters or kilograms | Both | Both stored. Meters drive cylinder wear and waste %. Kg stored in parallel for reconciliation. |
| 4 | Cylinder life limit | Varies | New `cylinder_life_rules` table keyed on screen ruling and customer, with per cylinder override. |
| 5 | Cylinder ownership | Both company and customer owned | `ownership` enum on cylinders, plus `with_customer` status for cylinders that leave the premises. |
| 6 | Lamination in scope | Print only | Lamination fields dropped. `run_substrates` simplified to a single printed web. Adhesion tape test retained. |
| 7 | Stations per machine | 8 fixed | Hard check constraint 1 to 8. Grid is always exactly 8 rows. No dynamic station count anywhere. |
| 8 | Who enters run data | Machine operator | **Biggest change.** Kiosk auth model, tablet first station grid, offline capable entry moved from Phase 8 into Phase 4. |
| 9 | Language | English only | No i18n layer. |
| 10 | Volume | 100+ runs/month | ~1,300 runs and ~10,400 station rows per year. Trivial for Postgres. No partitioning, no read replicas. Photo storage is the only thing that grows. |

Answers 8 and 10 together set the engineering priority: **the system is small in data and hard in UX.** Almost none of the difficulty is in the database. All of it is in getting a machine operator to enter 8 stations of data reliably during a shift, on a tablet, possibly with bad wifi, possibly with ink on his hands.

---

## 1. What this system actually solves

Your Excel structure is a *record*. The software has to be a *memory*.

Excel tells you what happened on Run 4. The software must tell the operator, before Run 5 starts, that cylinder C-104 was already at 780,000 meters and showed doctor blade lines at station 4, that the PET from Supplier X batch B-2210 dropped to 36 dyne, and that the previous operator fixed a registration drift by dropping infeed tension from 12 kg to 9.5 kg.

Two halves:

| Half | Purpose |
|---|---|
| **Capture** | Operator enters job, run, 8 stations, substrate, machine settings, issues |
| **Recall** | Job 360, Cylinder lifetime ledger, and the Pre Run Briefing that surfaces prior issues before the next run |

The Pre Run Briefing is the product. Everything else is plumbing that feeds it.

---

## 2. How the system works

End to end, from a customer emailing artwork to an operator avoiding last month's mistake.

### 2.1 The lifecycle

**Step 1 · Customer sends artwork.**
The planner opens the desktop app and creates a job file. The system assigns `JF-0004` from a sequence. The planner enters the job number, customer, product, structure, colour count and default machine. Artwork PDF and shade card image upload to Storage.

**Step 2 · First revision is recorded.**
The planner creates `Rev-00` against that job file, marks it current, and attaches the shade card number. Nothing can run until a revision exists.

**Step 3 · Cylinders are engraved and registered.**
As cylinders come back from the engraver, they are added to the cylinder master with their screen ruling, stylus angle, circumference and ownership. Each gets an `engraved` event dated. The planner then maps cylinders to stations 1 through 8 on `Rev-00`, marking each as new, re-engraved or unchanged.

**Step 4 · A run is scheduled.**
The planner or supervisor creates Run 1 against the job file, picks the machine, date and shift. The system creates 8 empty station rows, marking stations above the colour count as idle.

**Step 5 · The operator opens the briefing.**
At the machine tablet, the operator taps his photo tile, enters his PIN, and sees today's runs. He opens Run 1. The Pre Run Briefing appears full screen. On a first run it is mostly empty, which is itself information: there is no history yet. He taps **Acknowledge and start run**, which stamps who acknowledged and when.

**Step 6 · The run is entered in three passes.**
The station grid opens on `Setup`: confirm the cylinder and ink at each of the 8 stations, most of it pre filled. Then `Running`: viscosity, dryer temperature, impression. Then `Close`: meters and any observation. Separately he records the substrate roll and batch, and the machine process values (tensions, exhaust, ambient). Everything autosaves. If the wifi drops, entries queue locally and a banner shows how many are pending.

**Step 7 · Problems are logged as they happen.**
Registration drifts above 180 m/min. The operator taps the issue button on the run header, picks the area `registration`, picks the title `drift at high speed` from the template list, types "dropped infeed 12 to 9.5, held steady", and flips the **Check this next run** toggle. Fifteen seconds. The system links that observation to the run, the machine, and the job file automatically.

**Step 8 · The run is closed.**
The operator enters produced quantity in meters and kilograms, waste in both, and picks a result. Waste percentages compute themselves. The run locks. After 24 hours only a supervisor can change it, and every change is audited.

**Step 9 · The data disperses into history.**
The moment the run closes, the same numbers appear in six other places without anyone re-entering them. Cylinder C-104 gains 62,000 meters on its lifetime ledger. The PET batch gains a usage record and, because an adhesion issue was linked to it, an entry on the substrate watchlist. The ink batch gains a viscosity data point. The observation joins the job's problem history and the shop-wide issue Pareto.

**Step 10 · The next run is where it pays off.**
Three weeks later the same job runs again, this time on G-01 instead of G-02. The operator opens Run 2 and the briefing is no longer empty. It warns that the machine changed and shows the last run on G-01 rather than the last run overall. It lists the open registration note from Run 1. It flags that C-104 is now at 84% of its life and marked worn. It shows the best run this job ever had and what its settings were. The operator acknowledges, and the station grid opens already filled with Run 1's cylinders, inks and blade settings, with the previous issue note sitting in an amber cell on station 4.

That is the whole product. Steps 1 through 8 are data entry. Steps 9 and 10 are the reason the data entry is worth doing.

### 2.2 What happens on an artwork change

The customer changes the design. The planner creates `Rev-01`, writes what changed, records which stations got new or re-engraved cylinders, and marks it current. `Rev-00` is never deleted. Every future run binds to `Rev-01`, and every past run still points at `Rev-00`. When a shade complaint arrives six months later, you can say exactly which revision was on the machine.

### 2.3 What happens across a cylinder's life

A cylinder accumulates meters only through `run_stations.meters_run`. Nobody ever types a cumulative figure. Cleaning and repair are recorded as events with the meter reading at that moment, so you can see whether a repair bought you 200,000 meters or 20,000.

**Re-engraving resets the surface, so it resets the life count.** A cylinder that has run 900,000 meters and is then re-engraved is a fresh printing surface on an old base. Lifetime meters keep climbing for base wear and costing, but the wear alert must count only meters since the last surface restoring event. Both numbers are tracked separately, see Section 7.2.

### 2.4 The three questions the system exists to answer

1. **Before a run:** what went wrong last time and what did we do about it?
2. **About a cylinder:** how many meters has this surface run, and should it come off the machine?
3. **After a complaint:** which revision, which batch, which operator, which settings, on which date?

If a feature does not serve one of those three, it belongs in Section 14, non goals.

---

## 3. User roles

Six roles plus one service identity. Roles are assigned on `profiles.role` and drive both the UI shell a person lands in and the row level policies.

### 3.1 Who each role is

| Role | Who this is in the shop | Signs in on | Their job in the system |
|---|---|---|---|
| **Admin** | Owner or IT | Desktop | Full access. Creates users, sets cylinder life rules, configures machines and masters. The only role that can soft delete a run. |
| **Planner** | Job coordinator or prepress | Desktop | Creates job files and artwork revisions, registers cylinders and maps them to stations, schedules runs, maintains customers and suppliers. Does not enter run data. |
| **Supervisor** | Shift in charge | Desktop and tablet | Reviews and corrects runs, edits locked runs, clears next-run notes, resolves sync conflicts, completes a run an operator left partial. The role that keeps data honest. |
| **Operator** | Machine operator | Tablet kiosk only | Enters runs, the 8 station grid, substrate, process values and observations. Restricted to his own machine and to unlocked runs. Sees no dashboards, no other machines, no settings. |
| **QC** | Quality inspector | Desktop and tablet | Records test results (adhesion tape test, solvent retention), logs and closes observations, maintains ink and substrate batch records including COA uploads. Read only on runs. |
| **Viewer** | Management, sales, customer service | Desktop | Read only. Job 360, cylinder status, dashboards, reports. Cannot change anything. |
| *Machine account* | Not a person. One per machine. | Tablet, permanently signed in | A service identity with role `operator` and a `default_machine_id`. IT signs it in once at install. Individual operators are identified on top of it by PIN, see Section 8. |

### 3.2 What each role sees on landing

- **Operator** lands on the machine home: today's runs on this machine, one large **Start next run** button, and nothing else. No navigation to speak of.
- **Supervisor** lands on a shift view: runs in progress across machines, runs awaiting close, open next-run notes.
- **Planner** lands on the job list.
- **Admin, QC, Viewer** land on the dashboard.

### 3.3 Permission matrix

| Table | Admin | Planner | Supervisor | Operator | QC | Viewer |
|---|---|---|---|---|---|---|
| customers, machines, suppliers, colour_names, issue_templates | CRUD | CRUD | R | R | R | R |
| cylinder_life_rules | CRUD | CRU | R | R | R | R |
| ink_products, ink_batches, substrate_batches | CRUD | CRUD | CRU | R | CRU | R |
| job_files | CRUD | CRUD | R | R | R | R |
| artwork_revisions, artwork_revision_cylinders | CRUD | CRUD | R | R | R | R |
| cylinders | CRUD | CRUD | CRU | R | R | R |
| cylinder_events | CRUD | CRU | CRU | C | C | R |
| runs, run_stations, run_process, run_substrates | CRUD | CRU | CRU | CRU own machine, unlocked only | R | R |
| observations | CRUD | CRU | CRU | CRU | CRU | R |
| attachments | CRUD | CRU | CRU | C | CRU | R |
| profiles | CRUD | R | R | R | R | R |
| audit_log | R | – | R | – | – | – |

C = create, R = read, U = update, D = delete. Blank means no access at all.

Two rules that are easy to get wrong and matter:

- **Operators cannot delete anything.** Not a station row, not an observation, not a photo. Mistakes are corrected by editing, and the audit log keeps both versions.
- **Nobody except admin can hard delete a run.** Deletion is `deleted_at`, and every view filters on it, so cylinder meters cannot silently vanish from a ledger.

---

## 4. Design direction: easy, clean, minimalist

Minimalist here is not a mood. It is a constraint that comes from the room. The kiosk runs on a tablet clamped near a press, under mixed lighting, operated by someone with solvent on his gloves who has 90 seconds between reel changes. Every element on that screen has to earn its place or it is costing someone time.

### 4.1 The design thesis

**The interface is a viewing booth.**

Printers judge colour against neutral grey, which is why viewing booths are neutral by standard. The UI follows the same rule: the chrome is achromatic, and the only saturated colour on screen is *data* colour, meaning the 8 station ink swatches and the four status signals. Nothing decorative is ever allowed to be colourful.

This is not only honest to the subject, it enforces minimalism structurally. A designer who wants to add a colourful accent has to break a stated rule to do it, so the rule holds under pressure over two years of feature requests.

### 4.2 Tokens

**Colour.** Six neutrals, four signals, eight data swatches.

```css
--ink-900:  #14161A;   /* primary text, kiosk surfaces */
--ink-600:  #4A5058;   /* secondary text */
--steel-400:#8B939C;   /* tertiary text, disabled */
--steel-200:#D9DDE1;   /* hairlines, borders */
--paper-100:#F2F4F5;   /* app background */
--paper-000:#FFFFFF;   /* cards, grid rows */

--signal-ok:      #1F7A4D;
--signal-warn:    #B26A00;
--signal-critical:#B3261E;
--signal-info:    #1B5FA8;

/* station swatches: the real inks, used only as swatches */
--stn-cyan:#00A0DF; --stn-magenta:#E5007E; --stn-yellow:#FFDD00;
--stn-black:#1A1A1A; --stn-ground:#8C8C8C; --stn-white:#FFFFFF;
--stn-self1:#7B3FA0; --stn-self2:#C25E00;
```

**Type.** IBM Plex Sans for interface, IBM Plex Mono for every number.

Plex was drawn for technical and machine documentation, which is the right lineage for this, and it is not the face that shows up on every dashboard. The mono rule is functional rather than stylistic: viscosity readings, meter counts, tensions, batch codes and cylinder numbers are compared down a column, and tabular figures with fixed width align. On the grid the operator is scanning for the one value that differs from the other seven. Proportional digits break that scan.

```css
--font-ui:   "IBM Plex Sans", system-ui, sans-serif;
--font-data: "IBM Plex Mono", ui-monospace, monospace;
/* only two weights exist in the whole product */
--weight-regular: 400;
--weight-semibold: 600;
```

**Scale.** One component library, two densities, switched by a root variable.

```css
:root            { --base: 14px; --row-h: 32px; --tap: 40px; --gap: 8px;  }
[data-shell=kiosk]{ --base: 18px; --row-h: 64px; --tap: 64px; --gap: 16px; }
```

Building two design systems for desktop and tablet is the failure mode here. There is one system, and the shell changes the density. That decision alone removes weeks of duplicate work.

**Everything else.**

- Radius: `4px`. One value, everywhere.
- Elevation: none, except a single hairline-plus-shadow on sticky bars. Depth is communicated with `1px solid var(--steel-200)`, not with shadows.
- No gradients. No illustrations. No decorative icons.

### 4.3 The signature element: the station rail

Every run screen carries a vertical rail of 8 segments down the left edge, one per print unit, in the same order as the physical machine. Each segment is filled with its station ink swatch. State reads at a glance:

```
┌─┐
│█│ 1  Cyan       ● complete
│█│ 2  Magenta    ● complete
│█│ 3  Yellow     ○ pending
│█│ 4  Black      ▲ previous issue     ← amber ring
│█│ 5  Ground     ○ pending
│█│ 6  Self 1     ▲ previous issue
│░│ 7  Self 2     — idle
│░│ 8  White      — idle
└─┘
```

It is the one memorable element in the product, it comes directly from the machine rather than from a design system, and on the kiosk it doubles as navigation: tap a segment to jump to that station. Everything around it stays quiet.

### 4.4 Minimalism rules, stated as rules

These go in the repo as lint-able conventions, not as aspirations.

1. **One primary action per screen.** Exactly one filled button. Everything else is a text or outline button.
2. **No icon without a text label on the kiosk.** Icon-only buttons fail with gloves and fail across shifts of varying literacy. Desktop may use icon-only in dense table rows, with tooltips.
3. **Two font weights, four type sizes, per screen.** If a screen needs a fifth size, the screen is doing too much.
4. **Colour is never the only carrier of meaning.** Every status colour is paired with a word or a shape. This is not just accessibility box-ticking: the tablet sits under variable factory lighting, and roughly 1 in 12 men has some colour vision deficiency. On a colour-critical shop floor that is not a hypothetical.
5. **Progressive disclosure over tabs-within-tabs.** The station grid has three field groups reached by a segmented control. Never a tab inside a tab.
6. **Empty states are instructions.** "No runs today. Tap Start next run to begin." Not an illustration, not "Nothing here yet".
7. **Errors say what to fix.** "Meters must be entered before closing the run" rather than "Validation failed". Errors do not apologise and are never vague.
8. **Motion is nearly absent.** The only animations are the per-row save status dot and the sync banner. On a shop floor tablet, animation reads as lag. `prefers-reduced-motion` is respected everywhere.

### 4.5 Copy conventions

Words are design material. The vocabulary has to be learnable in one shift.

- Active voice, sentence case, plain verbs. **Save changes**, not *Submit*. **Close run**, not *Finalize*.
- An action keeps its name through the whole flow. The button says **Close run**, the confirmation says **Run closed**, the status chip says **Closed**.
- Name things the way the floor names them. **Station**, **cylinder**, **reel**, **shade card**, **doctor blade**. Never `run_station_id`, never "entity", never "record".
- One job per element. A label labels. A hint demonstrates. Nothing does double duty.

### 4.6 Quality floor

Not announced in the UI, simply true of it.

- Minimum touch target 40px on desktop, 64px on kiosk.
- WCAG AA contrast, 4.5:1 on all text. The `--stn-yellow` swatch never carries text.
- Visible keyboard focus rings on desktop. The station grid is fully keyboard operable for supervisors correcting data at a desk.
- A **daylight mode** toggle on the kiosk that raises contrast for tablets near a window. Test it at the machine, at noon, before rollout.
- Every interactive element has an accessible name. The station rail is a real list, not a decorative div.

---

## 5. Domain model (Excel sheet to table map)

| Excel Sheet | Becomes |
|---|---|
| 1. Job Master | `job_files` + `customers` + `machines` |
| 2. Artwork History | `artwork_revisions` + `artwork_revision_cylinders` |
| 3. Run Entry | `runs` |
| 4. 8 Colour Entry | `run_stations` |
| 5. Cylinder Master | `cylinders` + `cylinder_events` + `cylinder_life_rules` + view `v_cylinder_ledger` |
| 6. Substrate History | `substrate_batches` + `run_substrates` |
| 7. Ink History | `ink_products` + `ink_batches` + fields on `run_stations` |
| 8. Machine / Process | `run_process` + per station fields on `run_stations` |
| 9. Problem / Observation | `observations` |
| 10. Job Search / Final History | Not a table. A page built from views. |

### Key design decisions

**Business keys are not database keys.** Every table has a UUID `id`. `job_file_no`, `job_no`, `cylinder_no`, `batch_no` stay as unique indexed text. You can re-issue a job file number later without breaking twenty foreign keys.

**Run # is scoped to Job File.** `UNIQUE (job_file_id, run_no)`.

**Every run binds to an artwork revision.** `runs.artwork_revision_id` is mandatory. This is how you answer "which revision was running when the shade shifted".

**Every run binds to a machine.** Since jobs move between machines, `runs.machine_id` is mandatory and `job_files.default_machine_id` is only a form default. Any comparison of process parameters across runs must filter on machine or it produces nonsense.

**Cylinder meters accrue per station per run and are never typed as a cumulative.** `run_stations.meters_run` is the only entry point. Cumulative is always a rollup over `opening_meters + sum(meters_run)`.

**Observations attach to whatever caused them.** A single observation can point at a run, a station, a cylinder, an ink batch, or a substrate batch. That is what makes "show me every problem ever caused by Supplier X PET" possible.

---

## 6. Database schema

Ordered migrations in `supabase/migrations/`.

### 6.1 Enums and extensions

```sql
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
```

### 6.2 People and access

```sql
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null,
  employee_no  text unique,
  role         user_role not null default 'viewer',
  -- operators sign in at a machine kiosk with a 4 digit PIN, see Section 8
  pin_hash     text,
  default_machine_id uuid,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);
```

### 6.3 Masters

```sql
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
```

### 6.4 Job files (job_no folded in, one to one)

```sql
create sequence job_file_seq start 1;

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
```

`job_file_no` is generated server side from the sequence. Users never type it, so it cannot collide.

### 6.5 Artwork revisions

```sql
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

create table artwork_revision_cylinders (
  id          uuid primary key default gen_random_uuid(),
  revision_id uuid not null references artwork_revisions(id) on delete cascade,
  station_no  int not null check (station_no between 1 and 8),
  cylinder_id uuid references cylinders(id),
  action      text not null,          -- new | re_engraved | unchanged | removed
  remarks     text,
  unique (revision_id, station_no)
);
```

### 6.6 Cylinders

```sql
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
  opening_meters       bigint not null default 0,      -- historical meters at import, see Section 12
  life_limit_override  bigint,                         -- set only when this cylinder is special
  location             text,
  notes                text,
  created_at           timestamptz not null default now(),
  constraint customer_owned_needs_customer
    check (ownership = 'company' or owned_by_customer_id is not null)
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

-- resolve the applicable limit for a cylinder
create or replace function fn_cylinder_life_limit(p_cylinder_id uuid)
returns bigint language sql stable as $$
  select coalesce(
    c.life_limit_override,
    (select r.limit_meters
       from cylinder_life_rules r
      where (r.customer_id is null or r.customer_id = c.owned_by_customer_id)
        and (r.screen_lpi_min is null or c.screen_lpi >= r.screen_lpi_min)
        and (r.screen_lpi_max is null or c.screen_lpi <= r.screen_lpi_max)
      order by r.priority, r.customer_id nulls last
      limit 1),
    1000000
  )
  from cylinders c where c.id = p_cylinder_id;
$$;

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
```

Seed `cylinder_life_rules` with something like:

```sql
insert into cylinder_life_rules (screen_lpi_min, screen_lpi_max, limit_meters, priority, notes) values
  (null, 100,  1500000, 100, 'coarse screen, deeper cells, longer life'),
  (101,  150,  1000000, 100, 'standard'),
  (151,  null,  700000, 100, 'fine screen, shallow cells, wears faster');
```

Tune these against your own scrap history in month two. The point is that the number lives in a table you can change, not in code.

### 6.7 Substrate (print only)

```sql
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

create table run_substrates (
  id                 uuid primary key default gen_random_uuid(),
  run_id             uuid not null references runs(id) on delete cascade,
  substrate_batch_id uuid not null references substrate_batches(id),
  roll_no            text,
  meters_used        numeric(12,2),
  kg_used            numeric(12,3),
  dyne_at_machine    numeric(5,2),
  treatment_side     text,
  observation        text,
  result             text
);
```

### 6.8 Ink

```sql
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
```

### 6.9 Runs (meters and kg both)

```sql
create table runs (
  id                  uuid primary key default gen_random_uuid(),
  job_file_id         uuid not null references job_files(id) on delete cascade,
  artwork_revision_id uuid not null references artwork_revisions(id),
  run_no              int  not null,
  machine_id          uuid not null references machines(id),
  run_date            date not null,
  shift               text,
  operator_id         uuid references profiles(id),
  supervisor_id       uuid references profiles(id),
  start_time          timestamptz,
  end_time            timestamptz,

  planned_qty_m       numeric(12,2),
  planned_qty_kg      numeric(12,3),
  produced_qty_m      numeric(12,2),
  produced_qty_kg     numeric(12,3),
  waste_m             numeric(12,2),
  waste_kg            numeric(12,3),

  waste_pct_m         numeric(6,3) generated always as (
                        case when coalesce(produced_qty_m,0) + coalesce(waste_m,0) > 0
                        then round(coalesce(waste_m,0) / (produced_qty_m + waste_m) * 100, 3)
                        end) stored,
  waste_pct_kg        numeric(6,3) generated always as (
                        case when coalesce(produced_qty_kg,0) + coalesce(waste_kg,0) > 0
                        then round(coalesce(waste_kg,0) / (produced_qty_kg + waste_kg) * 100, 3)
                        end) stored,

  avg_speed_mpm       int,
  max_speed_mpm       int,
  status              run_status not null default 'planned',
  result              run_result,
  remarks             text,
  briefing_ack_by     uuid references profiles(id),
  briefing_ack_at     timestamptz,
  locked_at           timestamptz,
  deleted_at          timestamptz,
  created_by          uuid references profiles(id),
  created_at          timestamptz not null default now(),
  unique (job_file_id, run_no)
);

create index on runs (job_file_id, run_no desc);
create index on runs (run_date desc);
create index on runs (machine_id, run_date desc);
create index on runs (status) where deleted_at is null;
```

**Waste convention:** `waste_pct_m` is the headline number everywhere in the UI. `waste_pct_kg` is shown next to it and is the one to trust when substrate thickness changed mid job. Both are generated columns so neither can be entered wrong.

### 6.10 The 8 station grid

```sql
create table run_stations (
  id                    uuid primary key default gen_random_uuid(),
  run_id                uuid not null references runs(id) on delete cascade,
  station_no            int  not null check (station_no between 1 and 8),
  colour_name           text references colour_names(name),
  is_idle               boolean not null default false,   -- station not used this run
  cylinder_id           uuid references cylinders(id),
  ink_product_id        uuid references ink_products(id),
  ink_batch_id          uuid references ink_batches(id),

  initial_viscosity_sec numeric(6,2),
  running_viscosity_sec numeric(6,2),
  viscosity_cup         text default 'Zahn #2',
  ink_temp_c            numeric(5,2),
  solvent_mix           jsonb,                    -- {"ethyl_acetate":60,"ipa":30,"nppa":10}
  solvent_added_kg      numeric(10,3),
  ink_consumed_kg       numeric(10,3),

  doctor_blade_type     text,
  doctor_blade_angle    numeric(5,2),
  impression_pressure   numeric(6,2),
  dryer_temp_c          numeric(6,2),
  dryer_air_flow        numeric(8,2),

  meters_run            numeric(12,2) not null default 0,

  previous_issue_note   text,                     -- carried forward, read only in UI
  observation           text,
  created_at            timestamptz not null default now(),
  unique (run_id, station_no)
);

create index on run_stations (cylinder_id);
create index on run_stations (ink_batch_id);
```

### 6.11 Machine and process parameters

```sql
create table run_process (
  run_id                uuid primary key references runs(id) on delete cascade,
  unwind_tension_kg     numeric(6,2),
  infeed_tension_kg     numeric(6,2),
  outfeed_tension_kg    numeric(6,2),
  rewind_tension_kg     numeric(6,2),
  chill_roll_temp_c     numeric(5,2),
  main_exhaust_pct      numeric(5,2),
  supply_air_pct        numeric(5,2),
  static_eliminator_on  boolean,
  ink_pump_settings     jsonb,
  registration_mode     text,                     -- auto | manual
  registration_tolerance_micron numeric(6,2),
  ambient_temp_c        numeric(5,2),
  ambient_rh_pct        numeric(5,2),
  solvent_retention_mg_m2 numeric(8,3),
  adhesion_tape_test_pct  numeric(5,2),
  other_settings        jsonb,
  remarks               text
);
```

### 6.12 Observations

```sql
create table observations (
  id                 uuid primary key default gen_random_uuid(),
  job_file_id        uuid not null references job_files(id) on delete cascade,
  run_id             uuid references runs(id) on delete cascade,
  run_station_id     uuid references run_stations(id) on delete cascade,

  cylinder_id        uuid references cylinders(id),
  ink_batch_id       uuid references ink_batches(id),
  substrate_batch_id uuid references substrate_batches(id),
  machine_id         uuid references machines(id),

  observed_at        timestamptz not null default now(),
  area               issue_area not null,
  severity           issue_severity not null default 'minor',
  title              text not null,               -- short searchable label
  description        text not null,
  action_taken       text,
  setting_changed    jsonb,                       -- {"infeed_tension_kg":{"from":12,"to":9.5}}
  result             text,
  is_resolved        boolean not null default false,
  next_run_note      text,
  next_run_note_cleared_at timestamptz,
  next_run_note_cleared_by uuid references profiles(id),
  photo_urls         text[] default '{}',
  reported_by        uuid references profiles(id),
  created_at         timestamptz not null default now()
);

create index on observations (job_file_id, observed_at desc);
create index on observations (cylinder_id)         where cylinder_id is not null;
create index on observations (substrate_batch_id)  where substrate_batch_id is not null;
create index on observations (ink_batch_id)        where ink_batch_id is not null;
create index on observations (area, severity);
create index obs_open_next_notes on observations (job_file_id)
  where next_run_note is not null and next_run_note_cleared_at is null;

-- a short library of common issue titles so operators pick instead of typing
create table issue_templates (
  id       uuid primary key default gen_random_uuid(),
  area     issue_area not null,
  title    text not null,
  hint     text,
  is_active boolean not null default true,
  unique (area, title)
);
```

`issue_templates` matters more than it looks. An operator picking "registration drift at high speed" from a list produces groupable data. An operator typing it produces six spellings and zero analytics.

### 6.13 Attachments and audit

```sql
create table attachments (
  id          uuid primary key default gen_random_uuid(),
  entity_type text not null,          -- job_file | artwork_revision | run | observation | cylinder
  entity_id   uuid not null,
  file_path   text not null,
  file_name   text not null,
  mime_type   text,
  size_bytes  bigint,
  uploaded_by uuid references profiles(id),
  created_at  timestamptz not null default now()
);
create index on attachments (entity_type, entity_id);

create table audit_log (
  id         bigserial primary key,
  table_name text not null,
  row_id     uuid not null,
  action     text not null,          -- insert | update | delete
  old_data   jsonb,
  new_data   jsonb,
  changed_by uuid,
  changed_at timestamptz not null default now()
);
create index on audit_log (table_name, row_id, changed_at desc);
```

Attach the audit trigger to `runs`, `run_stations`, `observations`, `cylinders` only. Auditing everything is noise.

---

## 7. Views and functions (the recall layer)

### 7.1 Cylinder lifetime ledger

```sql
create or replace view v_cylinder_ledger as
select
  c.id  as cylinder_id,
  c.cylinder_no,
  c.colour_name,
  jf.job_file_no,
  jf.job_no,
  m.code as machine,
  r.run_no,
  r.run_date,
  rs.station_no,
  rs.meters_run as current_running_m,
  c.opening_meters + sum(rs.meters_run) over (
    partition by c.id order by r.run_date, r.run_no
    rows between unbounded preceding and current row
  ) as cumulative_running_m,
  c.condition,
  rs.observation
from cylinders c
join run_stations rs on rs.cylinder_id = c.id and rs.is_idle = false
join runs r          on r.id = rs.run_id and r.deleted_at is null
join job_files jf    on jf.id = r.job_file_id
join machines m      on m.id = r.machine_id
order by c.cylinder_no, r.run_date, r.run_no;
```

### 7.2 Cylinder summary, with the re-engrave reset

Two different meter counts, because they answer two different questions.

- **Lifetime meters** is every meter the base has ever run. It answers cost and base fatigue questions.
- **Surface meters** is meters since the last surface restoring event, meaning `engraved`, `re_engraved` or `chrome_plated`. It answers the only question that matters on the floor: should this cylinder come off the machine? A cylinder re-engraved at 900,000 meters is a new printing surface on an old base, and alerting on its lifetime figure would pull a perfectly good cylinder off the press.

```sql
-- date of the last event that restored the printing surface
create or replace function fn_cylinder_surface_since(p_cylinder_id uuid)
returns date language sql stable as $$
  select max(event_date) from cylinder_events
   where cylinder_id = p_cylinder_id
     and event_type in ('engraved','re_engraved','chrome_plated');
$$;

create or replace view v_cylinder_summary as
with base as (
  select c.id,
         fn_cylinder_surface_since(c.id) as surface_since,
         fn_cylinder_life_limit(c.id)    as life_limit_meters
  from cylinders c
)
select
  c.id, c.cylinder_no, c.colour_name, c.ownership, c.status, c.condition,
  cu.name as customer_name,
  b.life_limit_meters,
  b.surface_since,

  -- lifetime: everything the base has ever run
  c.opening_meters + coalesce(sum(rs.meters_run), 0) as lifetime_meters,

  -- surface: only meters since the last engrave / re-engrave / re-chrome.
  -- opening_meters counts only if the surface predates the imported history.
  coalesce(sum(rs.meters_run) filter (
    where b.surface_since is null or r.run_date >= b.surface_since), 0)
  + case when b.surface_since is null then c.opening_meters else 0 end
    as surface_meters,

  round((
    coalesce(sum(rs.meters_run) filter (
      where b.surface_since is null or r.run_date >= b.surface_since), 0)
    + case when b.surface_since is null then c.opening_meters else 0 end
  )::numeric / nullif(b.life_limit_meters,0) * 100, 1) as life_used_pct,

  count(distinct r.job_file_id) as job_count,
  count(distinct r.id)          as run_count,
  max(r.run_date)               as last_used_on,
  (select max(ce.event_date) from cylinder_events ce
    where ce.cylinder_id = c.id and ce.event_type = 'cleaning') as last_cleaning,
  (select max(ce.event_date) from cylinder_events ce
    where ce.cylinder_id = c.id and ce.event_type = 'repair')   as last_repair,
  (select count(*) from observations o
    where o.cylinder_id = c.id and o.severity in ('major','critical')) as major_issue_count
from cylinders c
join base b               on b.id = c.id
left join customers cu    on cu.id = c.owned_by_customer_id
left join run_stations rs on rs.cylinder_id = c.id and rs.is_idle = false
left join runs r          on r.id = rs.run_id and r.deleted_at is null
group by c.id, cu.name, b.life_limit_meters, b.surface_since;
```

`life_used_pct` and every wear alert read `surface_meters`. Reports on cylinder cost and base replacement read `lifetime_meters`. The cylinder detail page shows both, with the re-engrave date as a visible marker in the ledger so nobody is confused about why the number dropped.

Cylinders with status `with_customer` or `at_engraver` are excluded from wear alerts, since they are not on a press to be pulled off.

### 7.3 Best run, machine aware

Because jobs move between machines, comparing a run on G-01 to a run on G-02 is misleading. Two views.

```sql
-- best run on the same machine (preferred reference)
create or replace view v_job_best_run_by_machine as
select distinct on (job_file_id, machine_id)
  job_file_id, machine_id, id as run_id, run_no, run_date,
  avg_speed_mpm, waste_pct_m, waste_pct_kg
from runs
where status = 'completed' and result = 'ok' and deleted_at is null
  and waste_pct_m is not null
order by job_file_id, machine_id, waste_pct_m asc;

-- best run overall (fallback when this job has never run on this machine)
create or replace view v_job_best_run_overall as
select distinct on (job_file_id)
  job_file_id, machine_id, id as run_id, run_no, run_date,
  avg_speed_mpm, waste_pct_m, waste_pct_kg
from runs
where status = 'completed' and result = 'ok' and deleted_at is null
  and waste_pct_m is not null
order by job_file_id, waste_pct_m asc;
```

### 7.4 Pre Run Briefing

The single most valuable object in the system. Takes the job file and the machine the next run will go on.

```sql
create or replace function fn_pre_run_briefing(p_job_file_id uuid, p_machine_id uuid)
returns jsonb
language plpgsql stable
as $$
declare
  v_last_run  runs%rowtype;
  v_last_on_machine runs%rowtype;
begin
  select * into v_last_run
  from runs
  where job_file_id = p_job_file_id and status = 'completed' and deleted_at is null
  order by run_no desc limit 1;

  select * into v_last_on_machine
  from runs
  where job_file_id = p_job_file_id and machine_id = p_machine_id
    and status = 'completed' and deleted_at is null
  order by run_no desc limit 1;

  return jsonb_build_object(

    'job', (
      select to_jsonb(x) from (
        select jf.job_file_no, jf.job_no, c.name as customer, jf.product_name,
               jf.structure, jf.no_of_colours,
               ar.revision_label, ar.shade_card_no, ar.customer_approval
        from job_files jf
        join customers c on c.id = jf.customer_id
        left join artwork_revisions ar on ar.job_file_id = jf.id and ar.is_current
        where jf.id = p_job_file_id
      ) x),

    'machine_change', (
      select case when v_last_run.id is null then null
                  when v_last_run.machine_id = p_machine_id then null
             else jsonb_build_object(
               'previous_machine', (select code from machines where id = v_last_run.machine_id),
               'new_machine',      (select code from machines where id = p_machine_id),
               'warning', 'Last run was on a different machine. Tension and dryer settings below may not transfer.',
               'last_run_on_this_machine', to_jsonb(v_last_on_machine))
             end),

    'last_run', to_jsonb(v_last_run),

    'best_run', (
      select to_jsonb(coalesce(bm, bo))
      from (select 1) z
      left join v_job_best_run_by_machine bm
        on bm.job_file_id = p_job_file_id and bm.machine_id = p_machine_id
      left join v_job_best_run_overall bo
        on bo.job_file_id = p_job_file_id),

    'open_next_run_notes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', o.id, 'area', o.area, 'severity', o.severity,
        'title', o.title, 'note', o.next_run_note,
        'from_run', rr.run_no, 'station', rs.station_no)
        order by o.severity desc, o.observed_at desc), '[]'::jsonb)
      from observations o
      left join runs rr on rr.id = o.run_id
      left join run_stations rs on rs.id = o.run_station_id
      where o.job_file_id = p_job_file_id
        and o.next_run_note is not null
        and o.next_run_note_cleared_at is null),

    'recurring_issues', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select o.area, o.title, count(*) as occurrences, max(o.observed_at) as last_seen
        from observations o
        where o.job_file_id = p_job_file_id
        group by o.area, o.title
        having count(*) >= 2
        order by count(*) desc limit 10
      ) x),

    'cylinder_alerts', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select distinct cs.cylinder_no, cs.colour_name, rs.station_no,
               cs.total_meters, cs.life_limit_meters, cs.life_used_pct,
               cs.condition, cs.last_cleaning, cs.ownership
        from run_stations rs
        join v_cylinder_summary cs on cs.id = rs.cylinder_id
        where rs.run_id = v_last_run.id
          and (cs.life_used_pct >= 80 or cs.condition in ('worn','damaged'))
        order by cs.life_used_pct desc
      ) x),

    'last_run_stations', (
      select coalesce(jsonb_agg(x order by x.station_no), '[]'::jsonb) from (
        select rs.station_no, rs.colour_name, rs.is_idle, c.cylinder_no,
               ip.ink_code, ib.batch_no as ink_batch,
               rs.initial_viscosity_sec, rs.running_viscosity_sec,
               rs.dryer_temp_c, rs.impression_pressure, rs.observation
        from run_stations rs
        left join cylinders c     on c.id  = rs.cylinder_id
        left join ink_products ip on ip.id = rs.ink_product_id
        left join ink_batches ib  on ib.id = rs.ink_batch_id
        where rs.run_id = coalesce(v_last_on_machine.id, v_last_run.id)
      ) x),

    'last_run_process',
      (select to_jsonb(rp) from run_process rp
        where rp.run_id = coalesce(v_last_on_machine.id, v_last_run.id)),

    'substrate_watchlist', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select sb.batch_no, s.name as supplier, sb.material_type,
               sb.thickness_micron, count(o.id) as issue_count
        from run_substrates rsub
        join substrate_batches sb on sb.id = rsub.substrate_batch_id
        join suppliers s          on s.id  = sb.supplier_id
        left join observations o  on o.substrate_batch_id = sb.id
        where rsub.run_id = v_last_run.id
        group by sb.id, s.name
        having count(o.id) > 0
      ) x)
  );
end;
$$;
```

### 7.5 Seed the 8 stations from the previous run

```sql
create or replace function fn_seed_run_stations(p_run_id uuid)
returns void language plpgsql as $$
declare
  v_run runs%rowtype;
  v_prev_run_id uuid;
begin
  select * into v_run from runs where id = p_run_id;

  select id into v_prev_run_id
  from runs
  where job_file_id = v_run.job_file_id and run_no < v_run.run_no
    and deleted_at is null
  order by run_no desc limit 1;

  if v_prev_run_id is not null then
    insert into run_stations (run_id, station_no, colour_name, is_idle, cylinder_id,
                              ink_product_id, doctor_blade_type, doctor_blade_angle,
                              previous_issue_note)
    select p_run_id, prs.station_no, prs.colour_name, prs.is_idle, prs.cylinder_id,
           prs.ink_product_id, prs.doctor_blade_type, prs.doctor_blade_angle,
           nullif(concat_ws(' | ', prs.observation,
             (select string_agg(o.next_run_note, ' | ')
                from observations o
               where o.run_station_id = prs.id
                 and o.next_run_note is not null
                 and o.next_run_note_cleared_at is null)), '')
    from run_stations prs
    where prs.run_id = v_prev_run_id
    on conflict (run_id, station_no) do nothing;
  end if;

  -- always ensure all 8 rows exist
  insert into run_stations (run_id, station_no, is_idle)
  select p_run_id, gs,
         gs > (select no_of_colours from job_files where id = v_run.job_file_id)
  from generate_series(1,8) gs
  on conflict (run_id, station_no) do nothing;
end; $$;
```

### 7.6 Apply run meters to all stations

The operator presses one button instead of typing the same number 8 times.

```sql
create or replace function fn_apply_run_meters(p_run_id uuid)
returns void language sql as $$
  update run_stations rs
     set meters_run = coalesce(r.produced_qty_m,0) + coalesce(r.waste_m,0)
    from runs r
   where r.id = p_run_id and rs.run_id = r.id and rs.is_idle = false;
$$;
```

### 7.7 Global search

```sql
create or replace function fn_global_search(q text)
returns table (kind text, id uuid, label text, sublabel text)
language sql stable as $$
  select 'job_file', jf.id, jf.job_file_no || ' / ' || jf.job_no, c.name || ' · ' || jf.product_name
    from job_files jf join customers c on c.id = jf.customer_id
   where jf.job_file_no ilike '%'||q||'%' or jf.job_no ilike '%'||q||'%'
      or jf.product_name ilike '%'||q||'%'
  union all
  select 'cylinder', c.id, c.cylinder_no, coalesce(c.colour_name,'') || ' · ' || c.status::text
    from cylinders c where c.cylinder_no ilike '%'||q||'%'
  union all
  select 'ink_batch', ib.id, ib.batch_no, ip.ink_code || ' · ' || ip.colour_name
    from ink_batches ib join ink_products ip on ip.id = ib.ink_product_id
   where ib.batch_no ilike '%'||q||'%'
  union all
  select 'substrate_batch', sb.id, sb.batch_no,
         s.name || ' · ' || sb.material_type || ' ' || sb.thickness_micron || 'µ'
    from substrate_batches sb join suppliers s on s.id = sb.supplier_id
   where sb.batch_no ilike '%'||q||'%'
  limit 40;
$$;
```

---

## 8. Auth model for shop floor operators

This is the change that answer 8 forces, and it is not optional. Machine operators will not manage individual email accounts and passwords on a shared tablet with wet hands.

**Model: machine kiosk session plus operator PIN.**

1. Each machine tablet signs in **once** to a long lived Supabase session as a machine account (`g01@yourdomain.local`) with role `operator`. IT does this at install, not the operator.
2. The app shows a persistent **operator picker**: a grid of photo tiles of the operators assigned to that machine.
3. The operator taps his tile and enters a 4 digit PIN. This sets an app level `active_operator_id`, stored in a cookie and written into every row he creates (`runs.operator_id`, `observations.reported_by`).
4. PIN auto locks after 30 minutes idle, but the Supabase session persists, so the tablet never gets logged out mid shift.

```sql
create or replace function fn_verify_operator_pin(p_profile_id uuid, p_pin text)
returns boolean language plpgsql security definer as $$
  select exists (
    select 1 from profiles
     where id = p_profile_id and is_active
       and pin_hash = crypt(p_pin, pin_hash));
$$;
```

**Trade off, stated plainly:** attribution is by PIN, not by cryptographic identity. Someone could enter another operator's PIN. For a print floor traceability system that is an acceptable trade. If you ever need hard attribution for a customer audit, switch operators to individual accounts and accept the login friction. Do not try to have both.

**RLS implication:** the machine account is one Supabase user, so row level policies cannot distinguish operators. Enforce operator scoping in server actions instead, and treat RLS as the outer wall: the machine account can only write to runs on its own machine, and only to unlocked runs.

```sql
create or replace function fn_my_role() returns user_role
language sql stable security definer as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function fn_my_machine() returns uuid
language sql stable security definer as $$
  select default_machine_id from profiles where id = auth.uid();
$$;

alter table runs enable row level security;

create policy "read all authed" on runs
  for select to authenticated using (deleted_at is null);

create policy "operator writes own machine unlocked runs" on runs
  for all to authenticated
  using (
    fn_my_role() in ('admin','planner','supervisor')
    or (fn_my_role() = 'operator'
        and machine_id = fn_my_machine()
        and locked_at is null)
  )
  with check (
    fn_my_role() in ('admin','planner','supervisor')
    or (fn_my_role() = 'operator'
        and machine_id = fn_my_machine()
        and locked_at is null)
  );
```

**Run locking:** `locked_at` is set when the run is completed. A scheduled job locks any `completed` run older than 24 hours. After that, only supervisor and above can edit, and every edit lands in `audit_log`.

### Role matrix

See Section 3.3. The matrix lives there because it is a description of people, not of policy syntax.

---

## 9. Application structure

```
gravuretrace/
├─ app/
│  ├─ (auth)/login/page.tsx
│  ├─ (kiosk)/
│  │  ├─ layout.tsx                    // tablet chrome, operator picker, PIN lock
│  │  ├─ page.tsx                      // machine home: today's runs, start next run
│  │  └─ run/[runId]/
│  │     ├─ page.tsx                   // tabbed run entry
│  │     ├─ stations/page.tsx          // the 8 station grid
│  │     ├─ process/page.tsx
│  │     ├─ substrate/page.tsx
│  │     └─ finish/page.tsx            // qty, waste, result, lock
│  ├─ (app)/
│  │  ├─ layout.tsx                    // desktop sidebar + role guard
│  │  ├─ page.tsx                      // dashboard
│  │  ├─ jobs/
│  │  │  ├─ page.tsx
│  │  │  ├─ new/page.tsx
│  │  │  └─ [jobFileId]/
│  │  │     ├─ page.tsx                // JOB 360  (Sheet 10)
│  │  │     ├─ artwork/page.tsx        // Sheet 2
│  │  │     ├─ runs/page.tsx           // Sheet 3
│  │  │     ├─ runs/[runId]/page.tsx
│  │  │     ├─ briefing/page.tsx       // PRE RUN BRIEFING, printable
│  │  │     └─ issues/page.tsx         // Sheet 9
│  │  ├─ cylinders/
│  │  │  ├─ page.tsx                   // master + wear board
│  │  │  └─ [cylinderId]/page.tsx      // lifetime ledger (Sheet 5)
│  │  ├─ substrates/[batchId]/page.tsx // where used + issue history
│  │  ├─ inks/[batchId]/page.tsx
│  │  ├─ issues/page.tsx               // cross job explorer + Pareto
│  │  ├─ reports/page.tsx
│  │  └─ settings/{users,machines,customers,suppliers,colours,life-rules}/page.tsx
│  └─ api/
│     ├─ import/route.ts
│     └─ export/[type]/route.ts
├─ components/
│  ├─ ui/                              // shadcn
│  ├─ kiosk/OperatorPicker.tsx, PinPad.tsx, OfflineBanner.tsx
│  ├─ run/StationGrid.tsx              // 8 rows, tablet first
│  ├─ run/QuickObservation.tsx         // 3 taps to log an issue
│  ├─ job/JobHeader.tsx, ArtworkTimeline.tsx, RunStrip.tsx
│  ├─ cylinder/WearGauge.tsx, LedgerTable.tsx
│  └─ briefing/BriefingSheet.tsx, AlertList.tsx
├─ lib/
│  ├─ supabase/{client,server,middleware}.ts
│  ├─ offline/queue.ts, sync.ts        // IndexedDB write queue
│  ├─ queries/  actions/  schemas/
│  └─ types/database.ts
└─ supabase/{migrations,seed.sql}
```

Two distinct shells. `(kiosk)` is the tablet UI: large targets, no sidebar, no dense tables, one task per screen. `(app)` is the desktop UI for planners and management. Building these as one responsive layout is a trap. They have different users, different hardware, and different jobs.

### Libraries

| Concern | Choice | Note |
|---|---|---|
| UI | shadcn/ui + Tailwind | Owned components, dense tables and big touch targets both possible |
| Data | Server Components + Server Actions | Except the station grid |
| Station grid | TanStack Query + Table | Optimistic updates, offline queue |
| Offline | Dexie (IndexedDB) + custom sync | See Section 10.3 |
| Forms | React Hook Form + Zod | Same schema server side |
| Charts | Recharts | Wear, waste trend, issue Pareto |
| Excel | SheetJS | Import legacy workbook, export reports |
| PDF | Playwright print to PDF on a route handler | Briefing sheet for the floor |

---

## 10. The key screens

### 10.1 Job 360 (Sheet 10)

Sticky header, collapsible sections.

```
┌────────────────────────────────────────────────────────────┐
│ JF-0001  ·  GR-2548  ·  ABC Foods                   [Active]│
│ Biscuit · PET 12 / MBOPP 20 · Rev-03 · SC-03 · 8 colours    │
│              [ Start Next Run ]  [ Pre Run Briefing ]       │
└────────────────────────────────────────────────────────────┘

▸ ARTWORK HISTORY     Rev-00 ─ Rev-01 ─ Rev-02 ─ ●Rev-03
▸ RUN HISTORY         15 runs · G-02 ×12, G-01 ×3 · avg waste 4.2%
▸ 8 COLOUR STATIONS   current cylinder + ink per station
▸ CYLINDER STATUS     wear bars, red above 80%
▸ SUBSTRATE HISTORY   supplier / batch / dyne / result
▸ INK HISTORY         code / batch / viscosity / solvent
▸ MACHINE PARAMETERS  last run vs best run on same machine
▸ PROBLEM HISTORY     grouped by area, recurring flagged
▸ NEXT RUN NOTES      open items with clear action
```

The run history strip is horizontal chips: green ok, amber ok with issues, red rejected, with the machine code on each chip. Because jobs move machines, the machine code on the chip is not decoration. It is the first thing that explains an outlier.

### 10.2 Pre Run Briefing

Generated from `fn_pre_run_briefing(job_file_id, machine_id)`. Printable A4, and shown full screen on the kiosk before a run can start.

```
PRE RUN BRIEFING          JF-0001 / GR-2548 / Run 16
22 Aug 2026 14:30                    Rev-03 · SC-03 · Machine G-01

⚠ MACHINE CHANGE
  Last run was on G-02. Tension and dryer values below are from
  Run 11, the last time this job ran on G-01.

⚠ MUST CHECK BEFORE START                        (3 open notes)
  1. Stn 4 Black C-104: doctor blade lines from 65k m on Run 15.
     Change blade before start.
  2. Stn 6 Self 1: viscosity drifted above 22 s after 2 hrs.
     Solvent top up every 15 min.
  3. Registration drifted above 180 m/min. Cap 170 until first
     5,000 m checked.

🔴 CYLINDER ALERTS
  C-104  Black  842,000 / 1,000,000 m   84%   worn   customer owned
  C-101  Cyan   310,000 / 1,000,000 m   31%   good   company

🔁 RECURRING ISSUES (2+ times on this job)
  registration · drift at high speed        4 times
  adhesion     · bond drop on PET batch X   2 times

📋 LAST RUN ON THIS MACHINE (Run 11, G-01, 14 Jun 2026)
  Speed 168 m/min · Infeed 11 kg · Rewind 12 kg
  Dryer 1-8: 55/58/60/60/62/62/58/55 °C
  Result: OK · Waste 3.4% (m) / 3.9% (kg)

🥇 BEST RUN ON THIS MACHINE (Run 9, G-01, 03 Apr 2026)
  Speed 190 m/min · Infeed 11 kg · Waste 2.1% (m)

  [ Acknowledge and Start Run 16 ]
```

Acknowledging writes `briefing_ack_by` and `briefing_ack_at` on the run, then calls `fn_seed_run_stations`. That acknowledgement record is what makes the system defensible when an old mistake repeats.

### 10.3 Station grid, tablet first

Answer 8 makes this the screen the whole project lives or dies on.

**Layout:** on a 10 inch tablet in landscape, 8 rows fit if each row is 64px. Columns are scrollable horizontally but station, colour and cylinder are pinned left. Field groups switch with a segmented control at the top: `Setup` (cylinder, ink, blade), `Running` (viscosity, dryer, impression), `Close` (meters, observation). Three passes of 8 rows beats one pass of 24 columns.

**Rules:**
- Every cell that can be pre filled is pre filled from the previous run. The operator confirms rather than types.
- Numeric cells open a large on screen number pad, not the OS keyboard.
- Cylinder and ink cells are typeahead against masters. No free text.
- The `Prev Issue` column is read only with an amber background. It cannot be dismissed from the grid, only from the briefing.
- One button at the bottom: **Apply run meters to all stations**, calling `fn_apply_run_meters`. Idle stations are skipped.
- Bottom bar shows a live warning if any cylinder will cross its life limit during this run.
- Autosave per field with 800ms debounce. Every save shows a per row status dot: saved, pending, failed.

**Offline:** writes go to an IndexedDB queue first, then flush to Supabase. The UI never blocks on the network. A persistent banner shows `3 changes pending sync`. On reconnect, flush in order, last write wins per field, and surface conflicts to the supervisor rather than the operator. This is built in Phase 4, not bolted on later, because a grid designed for online-only cannot be retrofitted cleanly.

### 10.4 Quick observation, three taps

The operator will log nothing if it takes a form. Target: 15 seconds.

1. Tap the issue button on any station row or the run header
2. Pick an area chip, then pick a title from `issue_templates` filtered to that area
3. Optional: photo from camera, one line of action taken, and a toggle **Check this next run** which populates `next_run_note`

Everything else (severity default minor, timestamps, links to run, station, cylinder, ink batch, substrate batch) is inferred from context and filled server side.

### 10.5 Cylinder lifetime page (Sheet 5)

```
C-104  ·  Black  ·  Customer owned (ABC Foods)
Engraved 12 Jan 2025 · 550 mm circ · 120 LPI · 130° stylus
Life rule: standard 101-150 LPI → 1,000,000 m

[████████████████████░░░░]  842,000 / 1,000,000 m   84%
Status: on_machine   Condition: worn   Last cleaning: 02 Aug 2026

RUNNING HISTORY
Job File    Job No     Mc     Run  Date        This Run   Cumulative  Note
JF-0001     GR-2548    G-02   15   12 Aug 26     62,000     842,000   blade lines
JF-0001     GR-2548    G-02   14   28 Jul 26     58,000     780,000   ok
JF-0003     GR-2601    G-01    3   10 Jul 26     41,000     722,000   ok
                                        (opening at import: 480,000)

SERVICE EVENTS
02 Aug 26  cleaning    at 780,000 m   in house
15 Mar 26  repair      at 512,000 m   Supplier Y   PKR 18,000
12 Jan 25  engraved    at 0 m         Supplier Y

LINKED ISSUES  (3 major)
```

---

## 11. Build phases

One full time developer. At 100+ runs a month you have real usage from week one of go live, so phase order is chosen to make Phase 4 shippable to a single pilot machine before the rest exists.

### Phase 0 · Foundation and design system (4 to 5 days)
Next.js 15, TypeScript strict, Tailwind, shadcn. Supabase project and local CLI. Auth with invite only signup. `profiles` with trigger on `auth.users`. Middleware role guard.

The design tokens from Section 4 land here as real CSS variables and Tailwind theme extensions, plus the two shells `(app)` and `(kiosk)` driven by the `--base` / `--row-h` / `--tap` density switch. Build the station rail component and a token showcase page in this phase. Doing tokens later means retrofitting every screen, and the minimalism rules in Section 4.4 only hold if they are in the codebase before the first feature is.

**Done when:** you can log in as admin on desktop and as a machine account on a tablet, and the same button component renders at 40px on one and 64px on the other from a single source.

### Phase 1 · Masters (3 to 4 days)
customers, machines, suppliers, colour_names, ink_products, ink_batches, substrate_batches, issue_templates, cylinder_life_rules. CRUD with tables, search, soft delete. Seed with your real machines, suppliers and the standard 8 colour names.
**Done when:** every lookup an operator needs already exists.

### Phase 2 · Job files and artwork (4 days)
job_files with sequence generated numbers, artwork_revisions, artwork_revision_cylinders. Job list with filters. Create wizard. Revision timeline with a "new revision" flow that copies the previous cylinder set and marks what changed. Artwork PDF and shade card upload to Storage.
**Done when:** JF-0001 exists with Rev-00 through Rev-03 and the timeline reads correctly.

### Phase 3 · Cylinders (4 days)
cylinders, cylinder_events, life rule resolution. Master list with wear bars, ownership filter, status filter. Detail page (ledger empty until Phase 4). Bulk import of existing inventory with `opening_meters`.
**Done when:** every physical cylinder in your store exists with a correct opening meter reading.

### Phase 4 · Run entry on tablet (10 to 12 days) ← the heavy one
runs, run_stations, run_process, run_substrates. Kiosk shell, operator picker, PIN pad. Run create flow. `fn_seed_run_stations`. The station grid with three field groups, number pad, typeahead, autosave. Offline queue and sync. Process and substrate screens. Finish flow with qty in meters and kg, waste, result, lock.
**Done when:** a real operator enters a real run end to end on a tablet in under 6 minutes, with wifi turned off for part of it.

**Ship this to one pilot machine before starting Phase 5.** Two weeks of one machine using it will teach you more than the rest of the plan.

### Phase 5 · Observations (3 days)
observations, issue_templates in use, quick observation flow, camera capture with client side compression, `next_run_note` flag and clear, issue list per job.
**Done when:** an operator logs an issue in 15 seconds without leaving the station grid.

### Phase 6 · Recall layer (5 to 6 days)
All views. Job 360 assembled. Cylinder ledger live. `fn_pre_run_briefing` and the briefing page, both printable A4 and full screen on kiosk. Acknowledge and start run.
**Done when:** starting Run 16 shows what went wrong in Run 15 without anyone remembering it.

### Phase 7 · Intelligence (4 to 5 days)
Dashboard: runs this week, waste trend by machine, cylinders nearing life, open next run notes across all jobs, issue Pareto. Best run vs last run comparison. Cross job issue explorer. Supplier and batch scorecards. Alerts at 80% and 95% cylinder life.
**Done when:** you answer a quality question without opening a single run record.

### Phase 8 · Migration and hardening (5 days)
Excel importer with dry run preview and error report. Exports to xlsx and PDF. Audit triggers. Scheduled run locking. Backup policy and point in time recovery. Rollout to remaining machines.
**Done when:** the workbook is retired.

**Total: roughly 41 to 47 working days.** Phase 4 grew by 4 days from v1 because operator entry on a tablet with offline support is a different build from a desktop form.

---

## 12. Migration from Excel

Order matters because of foreign keys.

1. `customers`, `suppliers`, `machines`, `colour_names`, `issue_templates` (manual, small)
2. `cylinder_life_rules` (3 to 5 rows)
3. `ink_products`, `ink_batches`, `substrate_batches` from distinct values in Sheets 6 and 7
4. `cylinders` from Sheet 5 distinct cylinder numbers
5. `job_files` from Sheet 1
6. `artwork_revisions` from Sheet 2
7. `runs` from Sheet 3
8. `run_stations` from Sheet 4
9. `run_substrates`, `run_process` from Sheets 6 and 8
10. `observations` from Sheet 9

**Opening cylinder meters.** Your Excel cumulative will not equal the sum of imported `run_stations.meters_run`, because the Excel history does not go back to engraving. Set `cylinders.opening_meters` to `(Excel cumulative) − (sum of meters in the runs you are importing)`. The ledger then starts from a truthful baseline without inventing fake run records. Also insert one `cylinder_events` row of type `inspection` dated at import with `meters_at_event = opening_meters` and description "opening balance from Excel", so the number has a visible provenance.

**Validation before go live.** Pick three cylinders and three jobs. Reconcile the software's cumulative meters against the Excel figure to the meter. When they differ, fix the mapping, never the data.

---

## 13. Risks and mitigations

| Risk | Mitigation |
|---|---|
| **Operator will not enter data during a run** (the top risk, given answer 8) | Under 6 min target. Pre fill everything. Number pad not keyboard. Three field groups not 24 columns. Pilot on one machine first. Supervisor can complete a run the operator left partial. |
| Bad wifi on the floor | Offline queue in Phase 4, not Phase 8. UI never blocks on network. |
| Wet or gloved hands on a tablet | 64px minimum touch target. Rugged case with screen protector. Test with actual gloves before rollout. |
| Meters entered inconsistently across stations | Default all stations to run total via one button. Only override for idle stations. |
| Cumulative cylinder meters drift from reality | Cumulative is always derived, never editable. Corrections go through a `cylinder_events` adjustment with a reason. |
| Same colour or issue typed six ways | `colour_names` and `issue_templates` masters. Free text only in `description` and `observation`. |
| Job moves machine and settings are copied blindly | Briefing raises an explicit machine change warning and shows the last run on the *target* machine instead. |
| Two operators editing one run | Supabase Realtime presence on the run page. Show who is editing which station. |
| Someone deletes a run | Soft delete only, admin only, and cylinder meters recompute correctly because views filter `deleted_at is null`. |
| UI accretes clutter over two years of requests | Section 4 rules are lint-able conventions in the repo, not aspirations. The achromatic-chrome rule in 4.1 means any decorative colour is a visible violation, not a matter of taste. |
| Photos blow up storage | Compress client side to max 1600px and 200KB before upload. At 100 runs a month with 2 photos each that is under 500MB a year. |
| Customer owned cylinders leave the premises and the ledger stalls | `with_customer` status plus `issued_to_customer` and `received_from_customer` events. Cylinders in that status are excluded from wear alerts. |

---

## 14. Non goals for v1

- No CAPA workflow, approvals, or non conformance closure. Process history only, per your spec.
- No production planning, scheduling, or capacity board.
- No inventory or stock deduction. Batches are referenced, not consumed.
- No costing or P&L.
- No ERP integration.
- No lamination, slitting, or pouching. Print only.
- No spectrophotometer integration. Design allows a `delta_e` column on `run_stations` later.
- No multi plant. Single plant, single tenant.
- No multilingual UI.

---

## 15. Environment and deployment

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server only, never in the client bundle
```

- **Dev:** Supabase local via CLI, migrations in git, `supabase db reset` for a clean slate.
- **Staging:** separate project, seeded with anonymized data.
- **Prod:** Supabase Pro for point in time recovery and daily backups. Next.js on Vercel.
- **Migrations:** `supabase db push` from CI on merge to main. Never change schema through the dashboard.
- **Types:** regenerate `lib/types/database.ts` on every migration and commit it.
- **Sizing:** at 100+ runs a month you are looking at roughly 1,300 runs, 10,400 station rows and 2,000 observations per year. Supabase's smallest paid tier handles this for many years. Storage for photos is the only line item that grows meaningfully.

---

## 16. Immediate next actions

1. Scaffold the repo and run Phase 0.
2. Send one real filled Excel workbook, even partially filled, so the importer is built against real data shapes rather than assumed ones.
3. Decide the pilot machine and confirm the tablet hardware. Screen size and whether it will be wall mounted or handheld changes the station grid layout, so decide before Phase 4 starts.
4. Time one operator entering a run on paper today. That number is the target to beat, and it is the only measure of whether Phase 4 succeeded.
5. Provide your real cylinder life expectations by screen ruling so `cylinder_life_rules` seeds with something closer than my placeholder figures.
