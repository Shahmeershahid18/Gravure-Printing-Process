import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Announcing the framework and its version to every caller buys nothing and
  // narrows an attacker's search.
  poweredByHeader: false,

  // A trailing-slash variant of every route is a second URL for the same page:
  // one more thing for the middleware matcher to be right about.
  trailingSlash: false,

  eslint: {
    // Lint runs in CI and locally. Letting a warning fail a production deploy
    // at 2am is not a safety feature.
    ignoreDuringBuilds: false,
  },

  typescript: {
    ignoreBuildErrors: false,
  },

  /**
   * Per-request headers -- CSP with its nonce, plus everything in
   * SECURITY_HEADERS -- are set in the middleware, which is the only place
   * that can mint a nonce.
   *
   * HSTS belongs here rather than there: it is a property of the deployment,
   * it must survive on responses the middleware matcher skips, and Vercel
   * terminates TLS in front of this anyway.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ]
  },
}

export default nextConfig
