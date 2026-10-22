import type { NextConfig } from "next";

// cacheComponents / partialPrefetching are left off on purpose: this app is a
// client-side wizard with two stateless POST routes and nothing worth caching,
// and Cache Components would forbid the `runtime` export the routes use.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        // Every response: no indexing, no sniffing, no framing, no referrer leak, no device APIs.
        // (No CSP: Next injects inline scripts, and a wrong policy would break the app.)
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // API responses carry invoice details and email drafts: never cache them anywhere.
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
