# Intaglio — status against plan.md

Last verified: 23 Aug 2026, against the live Supabase project and a production
build served locally.

The product was called GravureTrace in the plan. It is now **Intaglio** —
intaglio is the printmaking family gravure belongs to, where the image is
engraved *into* the surface rather than raised from it, which is exactly what
the eight cylinders do.

---

## Verified working

Checked by signing in as each role against the live database and requesting
every route from a production build.

| Area | Evidence |
|---|---|
| Sign in | Real credentials; deactivated accounts rejected at sign-in and on every later request |
| Sign out | Clears the session and both operator cookies, redirects to sign-in |
| Tablet sign out | New: on the operator picker, behind a confirmation that counts open runs |
| Role landing | admin/QC/viewer → dashboard, planner → jobs, supervisor → shift, operator → tablet |
| Shell separation | Operators cannot reach the desktop shell; nobody else can reach the tablet |
| Route guards | 4 roles × 23 routes swept: every guard correct, 0 server errors |
| Permission matrix | Admin writes succeed, viewer writes rejected by the database, not just the UI |
| Kiosk PIN | Correct PIN accepts, wrong rejects, 30-minute idle lock returns to the picker |
| Station seeding | `fn_seed_run_stations` produced exactly 8 rows |
| Waste maths | Generated columns; neither figure can be typed |
| Cylinder ledger | Re-engrave resets surface meters while lifetime meters continue |
| Pre run briefing | RPC returns all 12 sections on both desktop and tablet |
| Run screens | Run detail, station grid, process, substrate and finish all render |
| Theme | Light / Dark / Auto, applied before first paint, no reload |
| Public pages | Landing, 14 guides, and three policies — all readable signed in or out |
| Responsive | 8 pages × 5 widths from 320px up: no sideways scroll, no text under 11px |
| Touch targets | 64px on the tablet, 44px on the public pages, all controls clear WCAG 2.2 AA |
| Browser | Driven in Chrome: 0 console errors, 0 hydration warnings, 0 CSP violations |
| Build | Typecheck clean, ESLint clean, production build clean |

## The public side

`/` is a short explainer. The detail lives in `/guide`, which has fourteen
pages grouped as Start here, At the machine, In the office and Concepts —
including the glossary and the lifetime-versus-surface-metres explanation that
used to make the landing page too long to read.

`/privacy`, `/terms` and `/cookies` describe what the software actually does
and are accurate about that. Each carries a visible notice naming what only the
operating organisation can fill in — legal entity, contact, sub-processors,
retention, governing law — because a policy that invents those is worse than no
policy. Have them reviewed before relying on them.

Nothing on any public page names a role that administers the system, an
internal route, an environment variable, or the hosting provider.

## Security

Fixed earlier, in `20260823090000_rls_and_hardening.sql`:

1. **Views leaked to anonymous callers.** All views are now `security_invoker`
   and revoked from `anon`.
2. **No write policies existed.** The Section 3.3 matrix is implemented per
   table and per operation.

Fixed now, in `20260823140000_realtime_and_pin_hardening.sql`:

3. **`pin_hash` was readable by every signed-in user.** RLS filters rows, not
   columns, so `select pin_hash from profiles` worked for anyone with a
   session. Bcrypt over a 4-digit space is 10,000 candidates, so a leaked hash
   is a leaked PIN — and the PIN is the whole attribution trail on the floor.
   Now revoked at column level, with a generated `has_pin` boolean for the two
   screens that legitimately need to know whether a PIN exists.

Hardened in the application:

- **Content Security Policy** with a per-request nonce, `strict-dynamic`, and
  no `unsafe-inline` for scripts. Verified: all 38 script tags in a rendered
  document carry the nonce named in the header.
- **HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy,
  COOP/CORP, X-Robots-Tag noindex.** `x-powered-by` removed.
- **Database errors are translated before they reach a browser.** A raw
  PostgREST error names tables, columns, constraints and policies; the
  originals now go to the server log and the user gets a sentence.
- **No infrastructure named in the UI.** The one dialog that printed an
  environment variable name and the provider's name now says what to do
  instead.
- Service-role key confirmed absent from every client bundle; the anon key is
  present, which is what it is for.
- The design-token showcase is now admin-only.

---

## Live updates — verified

All migrations through `20260823140000` are applied. Measured against the live
project with two subscribers listening while a real run was written:

| Check | Result |
|---|---|
| Channel handshake | `SUBSCRIBED` for authenticated clients |
| INSERT / UPDATE / DELETE on `runs` | all delivered |
| 8 station rows written in one statement | 8 events, collapsed by the client into one re-render |
| `pin_hash` readable by admin | **no** — `42501` |
| `pin_hash` readable by an operator | **no** — `42501` |
| `select *` on `profiles` | refused; the app selects explicit columns |
| `has_pin`, `v_operator_directory`, embedded `profiles(full_name)` | all still work |
| Anonymous subscriber, INSERT and UPDATE | nothing delivered |
| Anonymous subscriber, DELETE | receives `{"id": "…"}` — see below |

**One residual exposure, stated rather than glossed.** Supabase Realtime does
not apply RLS to DELETE events. Anyone holding the publishable key can
therefore learn that a row with a given uuid was deleted from one of the nine
live tables. Verified that the payload is the primary key alone — an anonymous
subscriber and a viewer both received exactly `{"id": "…"}` for a deleted run
and a deleted cylinder — so this is activity timing, not content. Closing it
entirely means moving off Postgres Changes to Broadcast-from-database with an
RLS-guarded topic, which is more machinery than this system needs today.

## Outstanding

**One optional migration:**
`supabase/migrations/20260823160000_realtime_replica_identity.sql`

Nothing is broken without it. `20260823140000` set `REPLICA IDENTITY FULL` on
the live tables on the argument that RLS needed the old row; measurement showed
it does not, and FULL writes the whole old row into the WAL on every update.
`run_stations` is updated continuously while a run is on the press, so this is
the one place that volume matters. Reverting costs nothing the application can
observe.

**Optional:** enable server-side sign-in creation so admins can add people from
Settings → Users. Without it that dialog explains what to do instead.

## Not built (plan Section 14 non-goals, plus deferred)

Out of scope per the plan: CAPA workflow, production scheduling, inventory
deduction, costing, ERP integration, lamination, spectrophotometer
integration, multi-plant, multilingual UI.

Deferred and worth knowing about:

- **Realtime presence** on the run page — who is editing which station
  (Section 13). Live *data* now arrives; showing the other person's cursor
  does not. The offline queue's last-write-wins per field is still the answer
  to a genuine collision.
- **Scheduled run locking.** `fn_lock_stale_runs()` exists but nothing calls it
  on a schedule.
- **Excel export.** The briefing prints to A4 from the browser. No xlsx export.
- **Attachments UI.** Table and policies exist; upload is not wired to a screen.
- **Excel import** covers masters, cylinders and job files, not runs, stations,
  substrates or observations.

## Deploying to Vercel

Set these in the project's environment:

| Variable | Required |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | only to create sign-ins from Settings → Users |

Apply the outstanding migration **before** the first deploy: the users screen
carries a temporary fallback for the missing column, and that fallback should
be deleted once the migration is live.

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

The machine account is bound to G-01 with operator PIN **1234**.

These are seed accounts on a demo project. Change or remove them before this
carries real production data.
