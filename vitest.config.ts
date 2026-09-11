import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    environmentMatchGlobs: [["**/*.test.tsx", "jsdom"]],
    setupFiles: ["./tests/setup.ts"],
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "tests/**/*.test.ts",
      "tests/**/*.test.mjs",
      "src/lib/pathway-authoritative-planning-layers.test.ts",
      "src/lib/pathway-authoritative-spatial.test.ts",
      "src/lib/pathway-check-acceptance.test.ts",
      "src/lib/pathway-free-decision.test.ts",
      "src/lib/pathway-site-evidence.test.ts",
      "src/lib/pathway-tfnsw-road-categorisation.test.ts",
      "src/lib/pathway-tfnsw-road-evidence-bridge.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
