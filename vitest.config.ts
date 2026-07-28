import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["src/__tests__/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["src/__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**"],
      exclude: [
        "src/__tests__/**",
        "src/**/*.test.*",
        "src/**/*.d.ts",
        "src/**/*.config.*",
        "src/router.*",
        "src/route-tree.*",
        "src/ssr.*",
        "src/styles.*",
        "src/env.d.ts",
      ],
      thresholds: {
        lines: 30,
        functions: 25,
        branches: 20,
        statements: 30,
      },
    },
  },
});
