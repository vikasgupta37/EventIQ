import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { browserHandler, limitPublicRequests } from "../lib/server/browser-api";
import { create_event_plan } from "../lib/engines";
import { extractDemo } from "../lib/agent/extract";
import * as extraction from "../lib/agent/extract";
import { withAIExecution } from "../lib/agent/execution";
beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("APP_ORIGIN", "https://eventiq.example");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
function request(
  path: string,
  body?: unknown,
  origin = "https://eventiq.example",
  ip = crypto.randomUUID(),
  signal?: AbortSignal,
) {
  const req = new NextRequest("https://eventiq.example/api/" + path, {
    method: body === undefined ? "GET" : "POST",
    signal,
    headers: {
      origin,
      "content-type": "application/json",
      "x-vercel-forwarded-for": ip,
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
  it("rejects a tampered budget before invoking planning", async () => {
    const state = create_event_plan(
      extractDemo("Wedding in Delhi February 2027 250 guests 12 lakh").event,
      "tampered",
    );
    state.categories[0].allocated += 1000;
    expect(
      (await request("demo/plan", { state, message: "What should I do next?" }))
        .status,
    ).toBe(400);
  });
  it("returns retry guidance after the public burst limit", async () => {
    const ip = crypto.randomUUID();
    for (let i = 0; i < 10; i++) limitPublicRequests(ip);
    const response = await browserHandler(
      new NextRequest("https://eventiq.example/api/demo/extract", {
        method: "POST",
        headers: {
          origin: "https://eventiq.example",
          "content-type": "application/json",
          "x-vercel-forwarded-for": ip,
        },
        body: JSON.stringify({ text: "Wedding in Delhi with 250 guests" }),
      }),
      { params: Promise.resolve({ path: ["demo", "extract"] }) },
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
  });
  it("limits bursts within a function instance and releases the next window", () => {
    const ip = crypto.randomUUID();
    for (let i = 0; i < 10; i++) limitPublicRequests(ip, 60000);
    expect(() => limitPublicRequests(ip, 60000)).toThrow("limit");
    expect(() => limitPublicRequests(ip, 120000)).not.toThrow();
  });
});

describe("Provider capacity lifetime", () => {
  it.each([
    ["demo/extract", "application/json"],
    ["demo/transcribe", "multipart/form-data; boundary=test"],
  ])(
    "does not reserve AI slots for unfinished %s uploads",
    async (path, contentType) => {
      const uploads = Array.from({ length: 4 }, () => {
        let close!: () => void;
        let reading!: () => void;
        const started = new Promise<void>((resolve) => {
          reading = resolve;
        });
        const body = new ReadableStream<Uint8Array>(
          {
            start(controller) {
              close = () => controller.close();
            },
            pull() {
              reading();
              return new Promise<void>(() => {});
            },
          },
          { highWaterMark: 0 },
        );
        const response = browserHandler(
          new NextRequest("https://eventiq.example/api/" + path, {
            method: "POST",
            headers: {
              origin: "https://eventiq.example",
              "content-type": contentType,
              "x-vercel-forwarded-for": crypto.randomUUID(),
            },
            body,
            duplex: "half",
          }),
          { params: Promise.resolve({ path: path.split("/") }) },
        );
        return { started, response, close };
      });
      try {
        // Each handler has reached its body reader; none has a complete payload.
        await Promise.all(uploads.map((upload) => upload.started));
        expect(
          (
            await request("demo/extract", {
              text: "Wedding in Delhi with 250 guests",
            })
          ).status,
        ).toBe(200);
      } finally {
        uploads.forEach((upload) => upload.close());
        const responses = await Promise.all(
          uploads.map((upload) => upload.response),
        );
        expect(responses.map((response) => response.status)).toEqual([
          400, 400, 400, 400,
        ]);
      }
    },
  );

  it("releases provider slots after failures without exposing the provider error", async () => {
    const text = "Wedding in Delhi with 250 guests";
    const provider = vi
      .spyOn(extraction, "extract_event_details")
      .mockRejectedValueOnce(new Error("Private provider failure"))
      .mockRejectedValueOnce(new Error("Private provider failure"))
      .mockResolvedValueOnce(extractDemo(text));
    const ip = crypto.randomUUID();
    for (let i = 0; i < 2; i++) {
      const response = await request(
        "demo/extract",
        { text },
        "https://eventiq.example",
        ip,
      );
      expect(response.status).toBe(503);
      expect(JSON.stringify(await response.json())).not.toContain(
        "Private provider failure",
      );
    }
    expect(
      (await request("demo/extract", { text }, "https://eventiq.example", ip))
        .status,
    ).toBe(200);
    expect(provider).toHaveBeenCalledTimes(3);
  });

  it("releases provider slots when in-flight requests are cancelled", async () => {
    let ready!: () => void;
    let started = 0;
    const bothStarted = new Promise<void>((resolve) => {
      ready = resolve;
    });
    const provider = vi
      .spyOn(extraction, "extract_event_details")
      .mockImplementation((_text, signal) =>
        withAIExecution<
          Awaited<ReturnType<typeof extraction.extract_event_details>>
        >(signal, () => {
          started++;
          if (started === 2) ready();
          return new Promise(() => {});
        }),
      );
    const ip = crypto.randomUUID();
    const controllers = [new AbortController(), new AbortController()];
    const pending = controllers.map((controller) =>
      request(
        "demo/extract",
        { text: "Wedding in Delhi with 250 guests" },
        "https://eventiq.example",
        ip,
        controller.signal,
      ),
    );
    try {
      await bothStarted;
      controllers.forEach((controller) => controller.abort());
      expect(
        (await Promise.all(pending)).map((response) => response.status),
      ).toEqual([408, 408]);
    } finally {
      controllers.forEach((controller) => controller.abort());
      await Promise.all(pending);
      provider.mockRestore();
    }
    expect(
      (
        await request(
          "demo/extract",
          { text: "Wedding in Delhi with 250 guests" },
          "https://eventiq.example",
          ip,
        )
      ).status,
    ).toBe(200);
  });
});
