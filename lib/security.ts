/**
 * Content Security Policy, built per request.
 *
 * The policy is nonce-based rather than `'unsafe-inline'`, because the one
 * inline script this app ships -- the pre-paint theme resolver -- is exactly
 * the kind of thing an injected `<script>` would imitate. `'strict-dynamic'`
 * then lets that trusted bootstrap pull in Next's own chunks without listing
 * every hashed filename, and makes the `https:` fallback inert in browsers
 * that understand it (it is there only for ones that do not).
 *
 * `style-src` keeps `'unsafe-inline'`: next/font and React both emit inline
 * style, and there is no injection path through CSS here worth the breakage.
 */

const SUPABASE_ORIGIN = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return ""
  try {
    return new URL(url).origin
  } catch {
    return ""
  }
})()

export function newNonce(): string {
  // Edge runtime: Web Crypto, not node:crypto.
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  let bin = ""
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin)
}

export function contentSecurityPolicy(nonce: string): string {
  const dev = process.env.NODE_ENV !== "production"
  const wss = SUPABASE_ORIGIN.replace(/^https:/, "wss:")

  return [
    `default-src 'self'`,
    // Turbopack's dev runtime evaluates its own module wrappers.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https:${dev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data: ${SUPABASE_ORIGIN}`,
    `font-src 'self' data:`,
    // Postgres changes arrive over a websocket to the same project.
    `connect-src 'self' ${SUPABASE_ORIGIN} ${wss}${dev ? " ws: http://localhost:*" : ""}`,
    `media-src 'self' blob: ${SUPABASE_ORIGIN}`,
    `worker-src 'self' blob:`,
    `frame-ancestors 'none'`,
    `frame-src 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    ...(dev ? [] : [`upgrade-insecure-requests`]),
  ]
    .join("; ")
    .replace(/\s{2,}/g, " ")
}

/**
 * Headers that do not vary per request.
 *
 * `X-Robots-Tag` is deliberate: none of this should be indexed. Even the
 * landing page describes an internal tool for one factory, and every other
 * route is behind a session.
 */
export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-DNS-Prefetch-Control": "off",
  "Permissions-Policy":
    "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Robots-Tag": "noindex, nofollow",
}
