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

---

## Notifications and the hidden super administrator — built, not yet applied

Two migrations were added on 23 Aug 2026 and **neither has been run against a
database**. They typecheck, lint and build clean, and their SQL has been
checked structurally, but no Postgres has parsed them: this machine has no
Docker for `supabase start` and the project is not linked for `supabase db
push`. Everything below is therefore *written and reviewed*, not *verified*,
and should be read that way until the checks at the end of this section pass.

### `20260823210000_notifications.sql`

Fan-out on write: one row per recipient in `notifications`, RLS
`recipient_id = auth.uid()`, delivered over the Postgres Changes socket the
app already runs. No queue and no worker.

Sixteen categories, raised by **database triggers** rather than by server
actions, because a run can be completed from the desktop, from the tablet, from
the offline queue replaying, or by an admin correcting history — hanging the
notification off the write is the only version a later code path cannot bypass.

| Where | What |
|---|---|
| Header bell | Unread count, latest twelve, mark all read. Live. |
| `/notifications` | Full inbox, filter by unread and by kind, archive |
| `/notifications/preferences` | Per-person switches, every role |
| `/settings/notifications` | Admin: role routing matrix, plus announcements |
| Kiosk | Full-width sheet at `--tap` sizing; critical items sort to the top |

Routing is data, in `notification_types`, so "stop paging QC about planned
runs" is a tick box rather than a migration. A category has to be routed to
your role *and* left on by you, so neither switch can silently override the
other.

Two behaviours worth knowing: you are never notified of your own action, and
cylinder wear alerts carry a `dedupe_key` per cylinder per threshold, because
"C-104 has passed 80%" is true on every subsequent run and saying it every time
teaches people to ignore the bell.

### `20260823200000_superadmin_role.sql`

**Total control** is eight lines, not a rewrite. Every write policy in
`20260823090000` goes through `fn_role_in()` and every read through
`fn_is_authed()`; both now return true for a super admin. No policy was
rewritten, so no policy can be forgotten when a table is added later.
`fn_can_write_run()` and the two run-lock triggers are widened separately
because they carry rules on top of the role check.

**Hidden** means absent, not greyed out. The profile row is filtered out of the
`profiles` read policy, the operator picker, and the audit trail for everyone
else; an admin cannot edit or deactivate one even knowing its uuid, at RLS
*and* at a trigger that catches the security-definer paths RLS does not cover.

Membership lives in `private.superadmins`. The `private` schema is not in
`config.toml`'s exposed list, so PostgREST cannot reach it at any privilege
level — it is not in the schema cache and not in the OpenAPI description.
Nothing there can leak by a forgotten `GRANT`, because there is no route.

**The activity log** is `private.activity_log`, readable only through
`fn_sa_*` functions that each call `fn_sa_guard()`. It records sign-ins,
sign-outs, failed sign-ins, PIN unlocks and failures, page views, and every
row change. `audit_log` gained inserts and grew from two tables to twenty-one.

The console is `/control`, which **404s** for everyone else rather than
redirecting — a redirect admits the route exists. Middleware deliberately does
not touch it. Its only link anywhere is in the account menu, rendered for that
one account.

Granted from the SQL editor, with no UI path to the first one:

```sql
select fn_grant_superadmin('you@example.com');   -- account must already exist
select fn_revoke_superadmin('you@example.com');  -- to undo
```

### Two things this deliberately does, stated rather than buried

1. **Page-view tracking is surveillance of legitimate users.** That is what was
   asked for and it is implemented, but `/privacy` does not yet mention it and
   should before this carries real data. See `components/activity/ActivityTracker.tsx`.
2. **`audit_log` will now grow fast.** The trigger covers `run_stations`, which
   an 800ms autosave rewrites throughout every run. `fn_sa_prune_activity()`
   and the retention panel on `/control/activity` exist for this; nothing calls
   them on a schedule. The activity *stream* excludes `run_stations` and
   `run_process` for the same reason — the full before/after is still in
   `audit_log`, which is where anyone investigating one run looks.

One regression was caught during review and fixed before it shipped: auditing
`profiles` would have copied every operator's bcrypt `pin_hash` into
`audit_log`, which admins and supervisors can read — undoing the column-level
revoke in `20260823140000` by a side door. `fn_audit_redact()` replaces the
value with `[redacted]` while keeping the key, so a reader can still see that
the field changed.

### `20260823220000_superadmin_user_removal.sql` — added after the first two

**Not yet applied.** The first two were pasted into the SQL editor by hand; this
one still needs running.

**Suspend, and delete.** Two operations, because "delete this suspicious user"
is almost never the right first move. A suspicious account is a live incident,
and everything that makes it suspicious is evidence — deleting the account
destroys the evidence to achieve the lockout. So `fn_sa_suspend_user` is the
default: reversible, instant, keeps the whole trail, clears the operator PIN.
It needs no session-revocation machinery because the middleware re-reads
`is_active` on every request.

`fn_sa_prepare_delete` is the deliberate one. Eleven columns across the schema
reference `profiles(id)` with no `ON DELETE` action, so the sign-in cannot be
removed while any of them point at it — and detaching them is exactly what
destroys "who ran this job". The function deactivates, writes a tombstone
naming the person, detaches, and reports the counts; the server action then
removes the sign-in through the Admin API, which is the only supported path
since `auth.users` is owned by `supabase_auth_admin`. Ordered so a partial
failure leaves a suspended account with detached history rather than a live
account whose trail has been wiped. The dialog names every one of those costs
and requires the account's name typed to confirm.

`fn_sa_signals` powers the overview's "Needs a look": repeated failed
sign-ins grouped by address, wrong PINs at a tablet, refused writes, unusual
read volume, deletion runs, and dormant-but-active accounts.

### Super admin routing

`landingFor(role, isSuperadmin)` now returns `/control` for the hidden account,
overriding the role entirely. The ordinary role is camouflage — it exists so
the account looks unremarkable where it cannot be hidden — so routing off it
would send a super admin carrying `admin` to the dashboard rather than to the
job the account is for.

Middleware resolves this lazily and memoised: every guard is a branch a super
admin overrides, but the common case (a planner opening `/jobs`) reaches none
of them, so the extra round trip is only paid where the answer changes the
outcome. The super admin is now also exempt from the kiosk shell split and the
`adminOnly` / `plannerOrAdmin` guards, matching `requireRole()` — previously
the signpost pointed away from pages the wall would have allowed.

### Console interface

Rebuilt around a left rail and an inverted ink header. The header is the one
deliberate break from the house style and it does a job: this account also
holds an ordinary admin role and works in the ordinary shell, so it has to be
able to tell which of the two it is looking at before it deletes somebody.
Everything below stays in the product's tokens.

The overview is ordered by how much a thing might need doing about it — signals
first, counts second, stream last. The activity list became a fixed-column grid
because the previous flex layout put the timestamp in a different place on
every line, which defeats the one thing that list is for.

### Before trusting any of the above

```
supabase db push          # or paste each file into the SQL editor, in order
select fn_grant_superadmin('you@example.com');
```

Then check, in this order: an admin's Settings → Users no longer lists the
granted account; `/control` returns 404 signed in as that admin and opens for
the super admin; signing in as the super admin lands on `/control` rather than
the dashboard; completing a run puts a notification in a planner's bell; the
tablet's Messages sheet shows a critical issue at the top; and
`select * from audit_log where table_name = 'profiles'` shows `[redacted]`
rather than a hash.

Deleting an account needs `SUPABASE_SERVICE_ROLE_KEY` on the server — without
it the console says so and points at suspension instead, rather than failing
halfway.

---

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
