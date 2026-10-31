import type { NextRequest } from "next/server";
import { browserStorageEnabled } from "@/lib/storage-mode";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
async function handler(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  if (browserStorageEnabled()) {
    const { browserHandler } = await import("@/lib/server/browser-api");
    return browserHandler(request, context);
  }
  const { GET } = await import("@/lib/server/database-api");
  return GET(request, context);
}
export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
