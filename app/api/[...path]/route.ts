import type { NextRequest } from "next/server";
import { browserStorageEnabled } from "@/lib/storage-mode";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
async function handler(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  let response: Response;
  if (browserStorageEnabled()) {
    const { browserHandler } = await import("@/lib/server/browser-api");
    response = await browserHandler(request, context);
  } else {
    const { GET } = await import("@/lib/server/database-api");
    response = await GET(request, context);
  }
  // Event data and AI replies must never enter a shared HTTP cache.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
