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
};

export default nextConfig;
