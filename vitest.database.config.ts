import { defineConfig } from "vitest/config";
import base from "./vitest.config";

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: [
      "tests/api.test.ts",
      "tests/management.test.ts",
      "tests/rate-limit.test.ts",
    ],
    env: {
      NEXT_PUBLIC_STORAGE_MODE: "database",
      DEMO_MODE: "true",
      OPENAI_API_KEY: "",
    },
  },
});
