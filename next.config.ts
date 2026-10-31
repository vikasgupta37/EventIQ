import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  // Separate production output from the development server's watched files.
  distDir:
    process.env.VERCEL === "1"
      ? ".next"
      : process.env.NODE_ENV === "production"
        ? ".next-production"
        : ".next",
};
export default config;
