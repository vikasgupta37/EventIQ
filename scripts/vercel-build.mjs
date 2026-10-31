import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const env = process.env;
if (env.VERCEL === "1") {
  const required = [
    "DATABASE_URL",
    "NEXTAUTH_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "APP_ORIGIN",
    "NEXTAUTH_URL",
  ];
  const missing = required.filter((key) => !env[key]?.trim());
  if (missing.length)
    throw new Error(
      `Missing Vercel environment variables: ${missing.join(", ")}`,
    );
  if (env.DEMO_MODE === "true")
    throw new Error("DEMO_MODE must be false on Vercel.");
  if (env.NEXTAUTH_SECRET.length < 32)
    throw new Error("NEXTAUTH_SECRET must contain at least 32 characters.");
  const origin = new URL(env.APP_ORIGIN);
  if (origin.protocol !== "https:" || origin.origin !== env.APP_ORIGIN)
    throw new Error(
      "APP_ORIGIN must be an HTTPS origin without a path or trailing slash.",
    );
  if (env.NEXTAUTH_URL !== origin.origin)
    throw new Error("NEXTAUTH_URL and APP_ORIGIN must match.");
  for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
    if (!env[key]) continue;
    const db = new URL(env[key]);
    if (
      !["postgres:", "postgresql:"].includes(db.protocol) ||
      ["localhost", "127.0.0.1", "[::1]"].includes(db.hostname)
    )
      throw new Error(`${key} must use hosted PostgreSQL.`);
  }
}
function run(relativeFile, args, overrides = {}) {
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL(relativeFile, import.meta.url)), ...args],
    {
      stdio: "inherit",
      env: { ...env, ...overrides },
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
run("../node_modules/prisma/build/index.js", ["generate"]);
// Each deployment environment must have its own database.
// DIRECT_URL is optional for providers that require a non-pooled migration connection.
run("../node_modules/prisma/build/index.js", ["migrate", "deploy"], {
  DATABASE_URL: env.DIRECT_URL || env.DATABASE_URL,
});
run("../node_modules/next/dist/bin/next", ["build"]);
