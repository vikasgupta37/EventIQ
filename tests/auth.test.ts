import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), upsert: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: mocks.session }));
vi.mock("../lib/db/client", () => ({ db: { user: { upsert: mocks.upsert } } }));
import { currentUser, demoEnabled } from "../lib/auth";
import { authOptions } from "../lib/auth-options";

beforeEach(() => {
  mocks.session.mockReset();
  mocks.upsert.mockReset();
  vi.stubEnv("DEMO_MODE", "false");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("NEXTAUTH_SECRET", "test-secret-not-for-production-123456");
  vi.stubEnv("GOOGLE_CLIENT_ID", "test-client");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-secret");
});
afterEach(() => vi.unstubAllEnvs());

describe("Google identity and deployment boundaries", () => {
  it("allows explicit local demo mode but never uses it on Vercel", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    expect((await currentUser()).id).toBe("demo-user");
    vi.stubEnv("VERCEL", "1");
    mocks.session.mockResolvedValue(null);
    expect(demoEnabled()).toBe(false);
    await expect(currentUser()).rejects.toMatchObject({ status: 401 });
  });
  it("fails closed for missing sessions or credentials", async () => {
    mocks.session.mockResolvedValue(null);
    await expect(currentUser()).rejects.toMatchObject({ status: 401 });
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    await expect(currentUser()).rejects.toMatchObject({ status: 401 });
  });
  it("uses the signed session identity, never a client-supplied user ID", async () => {
    mocks.session.mockResolvedValue({
      user: { id: "google:123", email: "planner@example.com", name: "Planner" },
    });
    expect(await currentUser()).toEqual({
      id: "google:123",
      email: "planner@example.com",
      name: "Planner",
    });
    mocks.session.mockResolvedValue({
      user: { id: "demo-user", email: "planner@example.com" },
    });
    await expect(currentUser()).rejects.toMatchObject({ status: 401 });
  });
  it("rejects an unverified Google email before creating an account", async () => {
    const result = await authOptions.callbacks!.signIn!({
      user: { id: "123", email: "planner@example.com" },
      account: { provider: "google", providerAccountId: "123" },
      profile: { email_verified: false },
    } as never);
    expect(result).toBe(false);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("keys verified accounts by Google subject and does not merge by email", async () => {
    mocks.upsert.mockResolvedValue({});
    expect(
      await authOptions.callbacks!.signIn!({
        user: { id: "123", email: "planner@example.com", name: "Planner" },
        account: { provider: "google", providerAccountId: "123" },
        profile: { email_verified: true },
      } as never),
    ).toBe(true);
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "google:123" },
        create: {
          id: "google:123",
          email: "planner@example.com",
          name: "Planner",
        },
      }),
    );
  });
});
