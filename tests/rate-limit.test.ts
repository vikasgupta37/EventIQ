import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "../lib/db/client";
import { limitRequests } from "../lib/rate-limit";
const userId = "rate-test-" + randomUUID();
afterAll(async () => {
  await db.requestRateLimit.deleteMany({
    where: { key: { contains: userId } },
  });
  await db.$disconnect();
});
describe("Shared PostgreSQL request limits", () => {
  it("atomically limits concurrent requests and separates users and windows", async () => {
    const now = Date.now();
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () => limitRequests(userId, "test", 3, now)),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(5);
    for (const result of results) {
      if (result.status === "rejected") expect(result.reason.status).toBe(429);
    }
    await expect(
      limitRequests(userId, "test", 3, now + 60000),
    ).resolves.toBeUndefined();
    await expect(
      limitRequests(userId, "other-scope", 3, now),
    ).resolves.toBeUndefined();
  });
});
