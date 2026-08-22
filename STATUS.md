# GravureTrace — status against plan.md

Last verified: 22 Aug 2026, against the live Supabase project and a production
build served locally.

This replaces `project_completion_report.md`, which claimed the project was
"100% ready for pilot". It was not: the project did not compile, six modules
were missing, and the two most valuable screens were placeholders.

---

## Verified working

Checked by signing in as each role against the live database and requesting
every route from a production build.

| Area | Evidence |
|---|---|
| Sign in | Real credentials against Supabase; deactivated accounts are rejected at sign-in and on every subsequent request |
| Sign out | Server action returns 303, clears the Supabase cookie and both kiosk operator cookies, redirects to `/login` |
| Role landing | admin/QC/viewer → `/dashboard`, planner → `/jobs`, supervisor → `/shift`, operator → `/kiosk` |
| Shell separation | Operators cannot reach the desktop shell; nobody else can reach the kiosk |
| Route guards | Non-admins bounce off `/settings/users`; non-planners bounce off `/settings` and `/jobs/new` |
| Permission matrix | Admin writes succeed, viewer writes are rejected by the database, not just the UI |
| Kiosk PIN | Correct PIN accepts, wrong PIN rejects, 30-minute idle lock returns to the picker without ending the machine session |
| Station seeding | `fn_seed_run_stations` produced exactly 8 rows and carried forward the previous run |
| Waste maths | Generated columns computed 3.846% by meters and 4.206% by weight; neither can be typed |
| Apply run meters | One button set all non-idle stations to produced + waste |
| Cylinder ledger | C-104 shows 842,000 lifetime meters but 0 surface meters after re-engraving, so it raises no wear alert — the Section 7.2 reset works |
| Every route | 36 routes, all 200, zero server errors |
| Build | Typecheck clean, ESLint clean, production build clean |

## Security fixes made

Two real holes were found and closed in `20260823090000_rls_and_hardening.sql`:

1. **Views leaked to anonymous callers.** `v_cylinder_ledger` ran with the
   definer's rights, so anyone holding the publishable anon key could read the
   whole cylinder master. All views are now `security_invoker` and revoked
   from `anon`. Verified: an anon request now returns nothing.

2. **No write policies existed.** RLS was enabled with read-only policies, so
   the application could not write anything at all. The permission matrix from
   plan Section 3.3 is now implemented per table and per operation.

Also hardened: `pin_hash` is never sent to a browser (the kiosk reads
`v_operator_directory`), PINs are set through an admin-only definer function,
and `fn_verify_operator_pin` is revoked from `anon`.

## Corrections to the plan's own SQL

- **Section 7.4, `fn_pre_run_briefing`.** `coalesce(bm, bo)` across two
  different view row types is not valid Postgres, so the briefing raised
  rather than rendering. Fixed in `20260823120000_fix_briefing_best_run.sql`,
  which also labels whether the best run came from this machine or another.
- **Run locking.** The previous trigger blocked *all* edits to a locked run,
  including by the supervisors Section 8 explicitly allows. Locking is now
  `locked_at` alone, and admin/supervisor can write past it.

---

## Outstanding

**One migration needs applying:**
`supabase/migrations/20260823120000_fix_briefing_best_run.sql`

Until it runs, the Pre Run Briefing shows "The briefing could not be built" on
both the kiosk and the desktop. Everything else works.

**Optional:** set `SUPABASE_SERVICE_ROLE_KEY` in the server environment to
create sign-ins from Settings → Users. Without it that dialog explains what to
do instead; every other user-management function works.

## Not built (plan Section 14 non-goals, plus deferred)

Deliberately out of scope per the plan: CAPA workflow, production scheduling,
inventory deduction, costing, ERP integration, lamination, spectrophotometer
integration, multi-plant, multilingual UI.

Deferred from Phase 8 and worth knowing about:

- **Realtime presence** on the run page (Section 13, "two operators editing one
  run"). Not built. The offline queue's last-write-wins per field is the
  current answer.
- **Scheduled run locking.** `fn_lock_stale_runs()` exists but nothing calls it
  on a schedule. Wire it to a cron job, or locking only happens by hand.
- **Excel export and PDF route handler.** The briefing prints to A4 from the
  browser, which covers the floor's need. There is no xlsx export yet.
- **Attachments UI.** The `attachments` table and its policies exist; artwork
  PDF and shade card upload is not wired to a screen.
- **Excel import** covers masters, cylinders and job files. Runs, stations,
  substrates and observations (plan Section 12, steps 7–10) are not imported.

---

## Demo credentials

Seeded accounts, all `password123` except the machine account:

| Email | Role |
|---|---|
| `admin@gravuretrace.local` | Admin |
| `planner@gravuretrace.local` | Planner |
| `supervisor@gravuretrace.local` | Supervisor |
| `qc@gravuretrace.local` | QC |
| `viewer@gravuretrace.local` | Viewer |
| `g01@gravuretrace.local` / `machine123` | Machine G-01 tablet |

The machine account is bound to G-01 with operator PIN **1234**. Sign in as it,
tap the operator tile, enter the PIN, and the machine home opens.
