/**
 * Role vocabulary and capability checks.
 *
 * Deliberately free of any server import so client components can use it
 * without dragging next/headers into the browser bundle.
 */

export type Role = "admin" | "planner" | "supervisor" | "operator" | "qc" | "viewer"

export const ROLES: Role[] = ["admin", "planner", "supervisor", "operator", "qc", "viewer"]

/** Where each role lands -- plan Section 3.2. */
export function landingFor(role: Role): string {
  switch (role) {
    case "operator":   return "/kiosk"
    case "supervisor": return "/shift"
    case "planner":    return "/jobs"
    default:           return "/dashboard"
  }
}

/**
 * Named for what the person may do, not for the role, so a page reads as
 * "can this person edit masters" rather than "is this person a planner".
 * These mirror the permission matrix in plan Section 3.3; the database
 * policies are the wall, and these are the signposts.
 */
export const can = {
  editMasters:      (r: Role) => r === "admin" || r === "planner",
  editLifeRules:    (r: Role) => r === "admin" || r === "planner",
  editBatches:      (r: Role) => ["admin", "planner", "supervisor", "qc"].includes(r),
  editJobs:         (r: Role) => r === "admin" || r === "planner",
  editCylinders:    (r: Role) => ["admin", "planner", "supervisor"].includes(r),
  enterRuns:        (r: Role) => ["admin", "planner", "supervisor", "operator"].includes(r),
  editLockedRuns:   (r: Role) => r === "admin" || r === "supervisor",
  deleteRuns:       (r: Role) => r === "admin",
  logObservation:   (r: Role) => ["admin", "planner", "supervisor", "operator", "qc"].includes(r),
  clearNextRunNote: (r: Role) => ["admin", "supervisor", "qc"].includes(r),
  manageUsers:      (r: Role) => r === "admin",
  viewAudit:        (r: Role) => r === "admin" || r === "supervisor",
  viewDashboards:   (r: Role) => r !== "operator",
}

export function roleLabel(role: Role): string {
  return role === "qc" ? "QC" : role.charAt(0).toUpperCase() + role.slice(1)
}

/** Initials for the account chip. Never more than two letters. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
