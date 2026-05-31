import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@app": fileURLToPath(new URL("../../apps/web/src", import.meta.url))
    },
    dedupe: ["react", "react-dom", "react-router", "react-router-dom", "@tanstack/react-query"]
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./setupTests.ts"],
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["lcov", "text-summary"],
      include: ["**/apps/web/src/**"],
      exclude: ["**/node_modules/**", "**/*.test.*", "**/*.spec.*"],
      reportsDirectory: "./coverage"
    }
  }
});
