/**
 * One place where a database error becomes a sentence a person can act on.
 *
 * Two reasons, and the second is the one that matters for a public deploy.
 *
 * Usability: plan Section 4.4 rule 7 says errors state what to fix. "new row
 * for relation \"runs\" violates check constraint \"runs_waste_ck\"" does not.
 *
 * Disclosure: a raw PostgREST error is a free schema dump. It names tables,
 * columns, constraints and policies, and "violates row-level security policy
 * for table X" tells an attacker both that X exists and exactly which action
 * was refused. None of that should reach a browser. The original is logged
 * server-side, where the people who need it can read it.
 */

export type DbError = {
  message?: string | null
  code?: string | null
  details?: string | null
  hint?: string | null
}

/** Postgres SQLSTATEs worth distinguishing to the person who hit them. */
const BY_CODE: Record<string, string> = {
  "23505": "That value is already in use. Enter a different one.",
  "23503": "This is linked to something that no longer exists. Refresh the page and try again.",
  "23514": "One of the values is outside the range this field allows.",
  "23502": "A required field was left empty.",
  "22P02": "One of the values is not in the format this field expects.",
  "42501": "Your role does not allow this change.",
  "40001": "Someone else changed this at the same moment. Refresh and try again.",
  "PGRST116": "That record no longer exists. It may have been removed.",
}

/**
 * Errors we raise ourselves, with `raise exception`, are already written for
 * the floor -- "Close the run before locking it" -- so they pass through.
 * Everything else is replaced.
 */
const OURS = new Set(["P0001"])

export function friendlyError(error: DbError | null | undefined, fallback: string): string {
  if (!error) return fallback

  // Server-side only: the browser never sees this, the logs always do.
  if (typeof window === "undefined") {
    console.error("[db]", error.code ?? "-", error.message ?? "", error.details ?? "")
  }

  const code = error.code ?? ""
  if (OURS.has(code) && error.message) return error.message
  if (code && BY_CODE[code]) return BY_CODE[code]

  // Older drivers and RPC paths do not always carry a code.
  const m = (error.message ?? "").toLowerCase()
  if (m.includes("duplicate key") || m.includes("already exists")) return BY_CODE["23505"]
  if (m.includes("row-level security")) return BY_CODE["42501"]
  if (m.includes("foreign key")) return BY_CODE["23503"]
  if (m.includes("check constraint")) return BY_CODE["23514"]
  if (m.includes("not-null") || m.includes("null value in column")) return BY_CODE["23502"]
  if (m.includes("permission denied")) return BY_CODE["42501"]
  if (m.includes("fetch failed") || m.includes("network")) {
    return "Could not reach the server. Check the connection and try again."
  }

  return fallback
}

/**
 * For the `throw` paths, which land on an error boundary. Next.js already
 * withholds server error text from the client in production, but a thrown
 * message also reaches the server logs and any error reporter, so it is worth
 * carrying the code rather than the prose.
 */
export function dbThrow(error: DbError, context: string): never {
  console.error("[db]", context, error.code ?? "-", error.message ?? "")
  throw new Error(`${context} failed${error.code ? ` (${error.code})` : ""}`)
}
