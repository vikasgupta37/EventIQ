import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "./db/client";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/signin", error: "/signin" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: { params: { scope: "openid email profile" } },
    }),
  ],
  callbacks: {
    async signIn({ account, profile, user }) {
      if (
        account?.provider !== "google" ||
        !account.providerAccountId ||
        !profile ||
        !("email_verified" in profile) ||
        profile.email_verified !== true ||
        !user.email
      )
        return false;
      // Google subject is the identity. Never merge accounts by email.
      await db.user.upsert({
        where: { id: `google:${account.providerAccountId}` },
        create: {
          id: `google:${account.providerAccountId}`,
          email: user.email,
          name: user.name || "Event Planner",
        },
        update: { email: user.email, name: user.name || "Event Planner" },
      });
      return true;
    },
    async jwt({ token, account }) {
      if (account?.provider === "google")
        token.userId = `google:${account.providerAccountId}`;
      return token;
    },
    async session({ session, token }) {
      if (session.user)
        session.user.id = typeof token.userId === "string" ? token.userId : "";
      return session;
    },
  },
};
