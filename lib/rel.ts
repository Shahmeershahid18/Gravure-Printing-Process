/**
 * Normalise an embedded Supabase relation to a single row.
 *
 * PostgREST returns a to-one relation as an object, but the generated types
 * widen every embed to an array. Casting at each call site produced dozens of
 * near-identical casts that were wrong in exactly the case that matters -- a
 * missing related row -- so the shape is normalised here instead.
 */
export function one<T>(rel: unknown): T | null {
  if (rel === null || rel === undefined) return null
  if (Array.isArray(rel)) return (rel[0] as T) ?? null
  return rel as T
}

/** The same, for a to-many relation that may arrive as a single object. */
export function many<T>(rel: unknown): T[] {
  if (rel === null || rel === undefined) return []
  return Array.isArray(rel) ? (rel as T[]) : [rel as T]
}
