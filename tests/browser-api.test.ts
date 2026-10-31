import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { browserHandler, limitPublicRequests } from "../lib/server/browser-api";
import { create_event_plan } from "../lib/engines";
import { extractDemo } from "../lib/agent/extract";
beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("APP_ORIGIN", "https://eventiq.example");
});
afterEach(() => vi.unstubAllEnvs());
function request(
  path: string,
  body?: unknown,
  origin = "https://eventiq.example",
) {
  const req = new NextRequest("https://eventiq.example/api/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      origin,
      "content-type": "application/json",
      "x-vercel-forwarded-for": crypto.randomUUID(),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return browserHandler(req, {
    params: Promise.resolve({ path: path.split("/") }),
  });
}
describe("Stateless public API", () => {
  it("reports browser mode and does not expose server event records", async () => {
    expect(await (await request("health")).json()).toMatchObject({
      storage: "browser",
      mode: "demo",
    });
    expect((await request("events")).status).toBe(404);
  });
  it("rejects cross-origin requests before running the planner", async () => {
    expect(
      (
        await request(
          "demo/extract",
          { text: "Wedding in Delhi with 250 guests" },
          "https://other.example",
        )
      ).status,
    ).toBe(403);
  });
  it("validates client state rather than trusting arbitrary JSON", async () => {
    expect(
      (await request("demo/plan", { state: {}, message: "Help" })).status,
    ).toBe(400);
  });
  it("returns a draft without persistence or a database connection", async () => {
    const state = create_event_plan(
      extractDemo("Wedding in Delhi February 2027 250 guests 12 lakh").event,
      "browser-event",
    );
    const response = await request("demo/plan", {
      state,
      message: "Reduce my budget to 10 lakh",
    });
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.state.budget).toBe(1000000);
    expect(state.budget).toBe(1200000);
  });
  it("limits bursts within a function instance and releases the next window", () => {
    const ip = crypto.randomUUID();
    for (let i = 0; i < 10; i++) limitPublicRequests(ip, 60000);
    expect(() => limitPublicRequests(ip, 60000)).toThrow("limit");
    expect(() => limitPublicRequests(ip, 120000)).not.toThrow();
  });
});
