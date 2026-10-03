import type { NextConfig } from "next";
import path from "node:path";

const config: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(import.meta.dirname, "../.."),
  poweredByHeader: false,
  experimental: { proxyClientMaxBodySize: "22mb" },
};
export default config;
