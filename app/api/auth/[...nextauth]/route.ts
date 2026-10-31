import type { NextRequest } from "next/server";
import { browserStorageEnabled } from "@/lib/storage-mode";
export const runtime = "nodejs";
async function handler(
  request: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> },
) {
  if (browserStorageEnabled())
    return Response.json(
      { error: "The public demo does not use sign-in." },
      { status: 404 },
    );
  const [{ default: NextAuth }, { authOptions }] = await Promise.all([
    import("next-auth"),
    import("@/lib/auth-options"),
  ]);
  return NextAuth(authOptions)(request, context);
}
export { handler as GET, handler as POST };
