import type { NextConfig } from "next";
import path from "node:path";

const config: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(import.meta.dirname, "../.."),
  outputFileTracingIncludes: {
    "/showcase/**": ["./assets/fonts/**/*"],
    "/api/collections/**": ["./assets/fonts/**/*"],
  },
  // Keep font parsing and the image renderer's WASM loading in Node. Bundling
  // next/og stalls its response stream in the production standalone server.
  serverExternalPackages: ["fontkit", "next/og"],
  poweredByHeader: false,
  async redirects() {
    // Preserve existing beta bookmarks while the replacement is evaluated.
    return [
      {
        source: "/collections/:collectionId/overview",
        destination: "/collections/:collectionId",
        permanent: false,
      },
      {
        source: "/collections/:collectionId/items",
        destination: "/collections/:collectionId/browse",
        permanent: false,
      },
      {
        source: "/collections/:collectionId/reports",
        destination: "/collections/:collectionId/insights",
        permanent: false,
      },
    ];
  },
  experimental: { proxyClientMaxBodySize: "22mb" },
};
export default config;
