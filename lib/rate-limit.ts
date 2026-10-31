import { db } from "./db/client";
import { AppError } from "./auth";
let lastCleanup = 0;
export async function limitRequests(
  userId: string,
  scope = "write",
  limit = 60,
  now = Date.now(),
) {
  const window = Math.floor(now / 60000);
  const bucket = await db.requestRateLimit.upsert({
    where: { key: `${scope}:${userId}:${window}` },
    create: {
      key: `${scope}:${userId}:${window}`,
      count: 1,
      expiresAt: new Date((window + 1) * 60000),
    },
    update: { count: { increment: 1 } },
  });
  if (bucket.count > limit)
    throw new AppError(429, "Too many requests. Please wait a minute.");
  if (now - lastCleanup > 3600000) {
    await db.requestRateLimit.deleteMany({
      where: { expiresAt: { lt: new Date(now - 86400000) } },
    });
    lastCleanup = now;
  }
}
