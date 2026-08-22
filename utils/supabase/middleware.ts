import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/** Routes reachable without a session. */
const PUBLIC_PREFIXES = ["/login", "/auth"]

/** Where each role lands. Mirrors landingFor() in lib/auth.ts. */
function landingFor(role: string): string {
  switch (role) {
    case "operator":   return "/kiosk"
    case "supervisor": return "/shift"
    case "planner":    return "/jobs"
    default:           return "/dashboard"
  }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() revalidates the token against Supabase on every request. Do not
  // swap it for getSession(), which trusts whatever the cookie claims.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isPublic = PUBLIC_PREFIXES.some((p) => path.startsWith(p))

  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone()
    url.pathname = pathname
    url.search = ""
    return NextResponse.redirect(url)
  }

  if (!user) {
    if (isPublic) return supabaseResponse
    // Remember where they were headed so sign-in can return them there.
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = ""
    return NextResponse.redirect(url)
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle()

  // A deactivated account keeps a valid token until it expires, so the check
  // has to happen on every request rather than only at sign-in.
  if (profile && profile.is_active === false) {
    await supabase.auth.signOut()
    return redirectTo("/login")
  }

  const role = profile?.role ?? "viewer"
  const home = landingFor(role)

  if (isPublic || path === "/") return redirectTo(home)

  // Two distinct shells with two distinct audiences (plan Section 9).
  // Operators live in the kiosk; nobody else belongs there, and an operator
  // has no business in the desktop shell.
  const inKiosk = path.startsWith("/kiosk")
  if (role === "operator" && !inKiosk) return redirectTo("/kiosk")
  if (role !== "operator" && inKiosk) return redirectTo(home)

  // Desktop routes that only some roles may open. RLS is the wall; this is the
  // signpost, so a viewer never lands on a page whose every control is denied.
  const adminOnly = ["/settings/users"]
  if (adminOnly.some((p) => path.startsWith(p)) && role !== "admin") {
    return redirectTo(home)
  }

  const plannerOrAdmin = ["/jobs/new", "/settings"]
  if (
    plannerOrAdmin.some((p) => path.startsWith(p)) &&
    !["admin", "planner"].includes(role)
  ) {
    return redirectTo(home)
  }

  return supabaseResponse
}
