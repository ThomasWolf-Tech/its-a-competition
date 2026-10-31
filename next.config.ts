import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Isolate the local auth test server from the regular preview.
  distDir: process.env.BRACKET_TEST_DIST_DIR ?? ".next",
  cacheComponents: true,
  partialPrefetching: true,
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
