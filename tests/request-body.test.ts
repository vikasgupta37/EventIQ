import { describe, expect, it, vi } from "vitest";
import { readJsonBody } from "../lib/request-body";
describe("Bounded JSON input", () => {
  it("accepts valid UTF-8 JSON", async () => {
    const request = new Request("https://eventiq.test/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Celebration 🎉" }),
    });
    expect(await readJsonBody(request)).toEqual({ name: "Celebration 🎉" });
  });
  it("cancels an oversized stream even when Content-Length is missing", async () => {
    const cancel = vi.fn();
    const request = new Request("https://eventiq.test/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(33 * 1024));
        },
        cancel,
      }),
      duplex: "half",
    } as RequestInit & { duplex: string });
    await expect(readJsonBody(request)).rejects.toMatchObject({ status: 413 });
    expect(cancel).toHaveBeenCalledOnce();
  });
  it("rejects non-JSON and malformed bodies", async () => {
    await expect(
      readJsonBody(
        new Request("https://eventiq.test", { method: "POST", body: "{}" }),
      ),
    ).rejects.toMatchObject({ status: 415 });
    await expect(
      readJsonBody(
        new Request("https://eventiq.test", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{",
        }),
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
});
