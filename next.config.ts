import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), geolocation=(), microphone=(self)",
          },
          // Keep Next's inline hydration/theme scripts working; restrict document embedding.
          {
            key: "Content-Security-Policy",
            value:
              "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' https://accounts.google.com",
          },
        ],
      },
    ];
  },
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
