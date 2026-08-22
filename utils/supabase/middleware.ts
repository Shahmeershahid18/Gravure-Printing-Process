import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { newNonce, contentSecurityPolicy, SECURITY_HEADERS } from "@/lib/security"

/** Routes reachable without a session. */
const PUBLIC_PREFIXES = ["/login", "/auth"]

/**
 * Pages anyone may read, signed in or out: the landing page, the guides, and
 * the policies.
 *
 * They are separate from PUBLIC_PREFIXES because those bounce a signed-in user
 * away -- correct for the sign-in form, wrong for a guide someone is halfway
 * through. These stay put and swap their own call to action instead.
 */
const OPEN_PAGES = ["/guide", "/privacy", "/terms", "/cookies"]

function isOpen(path: string): boolean {
  return path === "/" || OPEN_PAGES.some((p) => path === p || path.startsWith(p + "/"))
}

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
  // One nonce per request, handed to the document through a request header so
  // the root layout can stamp it on the inline theme script, and named in the
  // policy on the way back out.
  const nonce = newNonce()
  const csp = contentSecurityPolicy(nonce)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("content-security-policy", csp)

  const nextOptions = { request: { headers: requestHeaders } }

  /** Every response leaves through here, redirects included. */
  const secure = (res: NextResponse) => {
    res.headers.set("Content-Security-Policy", csp)
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v)
    return res
  }

  let supabaseResponse = NextResponse.next(nextOptions)

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
          supabaseResponse = NextResponse.next(nextOptions)
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
    return secure(NextResponse.redirect(url))
  }

  if (!user) {
    if (isPublic || isOpen(path)) return secure(supabaseResponse)
    // Remember where they were headed so sign-in can return them there.
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = ""
    return secure(NextResponse.redirect(url))
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

  if (isPublic) return redirectTo(home)

  // A signed-in reader stays on the landing page, the guides and the policies.
  // Each swaps its own call to action to point at their shell rather than
  // throwing them out of the page they were halfway through.
  if (isOpen(path)) return secure(supabaseResponse)

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

  return secure(supabaseResponse)
}
