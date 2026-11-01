import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../components/api";
const mocks = vi.hoisted(() => ({ browser: vi.fn(), browserApi: vi.fn() }));
vi.mock("../lib/storage-mode", () => ({
  browserStorageEnabled: mocks.browser,
}));
vi.mock("../lib/browser-store", () => ({ browserApi: mocks.browserApi }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.browser.mockReturnValue(false);
});
afterEach(() => vi.unstubAllGlobals());
describe("Client API transport", () => {
  it("routes browser operations locally and preserves cancellation", async () => {
    mocks.browser.mockReturnValue(true);
    mocks.browserApi.mockResolvedValue({ id: "local" });
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const controller = new AbortController();
    expect(
      await api(
        "events",
        "POST",
        { name: "Party" },
        { signal: controller.signal },
      ),
    ).toEqual({ id: "local" });
    expect(mocks.browserApi).toHaveBeenCalledWith(
      "events",
      "POST",
      { name: "Party" },
      { signal: controller.signal },
    );
    expect(fetch).not.toHaveBeenCalled();
  });
  it("never starts a cancelled operation", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const controller = new AbortController();
    controller.abort();
    await expect(
      api("events", "GET", undefined, { signal: controller.signal }),
    ).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.browserApi).not.toHaveBeenCalled();
  });
  it("sends JSON with cache disabled and forwards the request signal", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ saved: true }));
    vi.stubGlobal("fetch", fetch);
    const signal = new AbortController().signal;
    expect(
      await api("events/a", "PATCH", { budget: 1000 }, { signal }),
    ).toEqual({ saved: true });
    expect(fetch).toHaveBeenCalledWith("/api/events/a", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: '{"budget":1000}',
      cache: "no-store",
      signal,
    });
  });
  it("handles successful deletion without parsing an empty body", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    expect(await api("events/a", "DELETE")).toBeUndefined();
  });
  it.each([
    [
      Response.json(
        { error: "This event changed. Reload it." },
        { status: 409 },
      ),
      "This event changed. Reload it.",
    ],
    [
      new Response("<html>Unavailable</html>", { status: 502 }),
      "Connection failed.",
    ],
    [Response.json({}, { status: 500 }), "Please try again."],
  ])(
    "surfaces useful failures without exposing upstream HTML",
    async (response, message) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
      await expect(api("events")).rejects.toThrow(message);
    },
  );
});
