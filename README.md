# Intaglio

The memory of a gravure printing press.

Intaglio records how every reel was printed — the settings, the materials, the
problems and the fixes — and hands that back to the next shift *before* they
start the same job again. Gravure is an intaglio process: the image is engraved
into the copper cylinder rather than raised from it, which is where the name
comes from.

Built against `plan.md`. Current state and outstanding work: `STATUS.md`.

## Stack

Next.js 15 (App Router) · React 19 · Supabase (Postgres, Auth, Storage,
Realtime) · Tailwind CSS v4 · TypeScript.

## Running it

```bash
npm install
npm run dev
```

Requires a `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # optional: creating sign-ins from Settings → Users
```

Never commit that file, and never expose the service-role key to the browser —
it bypasses every row-level security policy in the database.

## Shape of the code

| Path | What lives there |
|---|---|
| `app/(app)` | The desktop shell: planners, supervisors, QC, admin |
| `app/(kiosk)` | The tablet at the machine: one task per screen, 64px targets |
| `app/(auth)` | Sign in |
| `app/page.tsx` | The public explainer at `/` |
| `components/ui` | The component library. One library, two densities |
| `lib/actions` | Server actions, one file per domain |
| `supabase/migrations` | Schema, RLS, views and functions, in order |

Two shells, one component library. Density is switched by `data-shell` on the
root element, which drives `--base`, `--row-h`, `--tap` and `--gap`. Building a
second design system for the tablet is the failure mode this avoids.

## Design rules

Stated in `plan.md` §4 and enforced in `app/globals.css`:

- The chrome is achromatic. The only saturated colour is *data* colour — the 8
  station ink swatches and the 4 status signals — plus one copper accent for
  interactive affordance.
- Colour is never the only carrier of meaning. Every state also has a word.
- One radius, two font weights, hairlines instead of shadows.
- Motion is nearly absent in the app. The landing page is the exception.

## Migrations

Applied in filename order through the Supabase SQL editor or CLI. Check
`STATUS.md` for which ones are already live.
