import { defineConfig, globalIgnores } from "eslint/config";
import next from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";
export default defineConfig([
  ...next,
  ...typescript,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-unused-expressions": "error",
    },
  },
  globalIgnores([
    ".next/**",
    ".next-production/**",
    "node_modules/**",
    "artifacts/**",
    ".data/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);
