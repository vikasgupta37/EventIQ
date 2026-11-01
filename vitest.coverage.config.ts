import { defineConfig } from "vitest/config";
import base from "./vitest.config.ts";
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    exclude: [
      "tests/api.test.ts",
      "tests/management.test.ts",
      "tests/rate-limit.test.ts",
    ],
    coverage: {
      provider: "v8",
      thresholds: { lines: 80, statements: 80, functions: 73, branches: 69 },
      reporter: ["text", "json-summary", "lcov", "html"],
      include: ["lib/**/*.ts", "components/**/*.{ts,tsx}"],
      // The optional database edition has its own PostgreSQL integration job.
      exclude: ["lib/db/**", "lib/server/database-api.ts", "lib/tools/**"],
    },
  },
});
