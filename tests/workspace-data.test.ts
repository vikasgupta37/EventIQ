// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { useWorkspaceData } from "../components/workspace/use-workspace-data";
import { create_event_plan } from "../lib/engines";
import { eventExample } from "../lib/event-examples";
import type { EventState } from "../lib/types";

const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("../components/api", () => ({ api: mocks.api }));
const first = create_event_plan(eventExample("Wedding"), "first");
const second = create_event_plan(eventExample("Birthday"), "second");
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
beforeEach(() => {
  localStorage.clear();
  mocks.api.mockReset();
  mocks.api.mockImplementation(async (path: string) =>
    path === "events"
      ? { events: [first, second], mode: "demo" }
      : path === "events/first"
        ? first
        : second,
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Workspace request lifecycle", () => {
  it("keeps the newest selected event when older requests finish later", async () => {
    const { result } = renderHook(useWorkspaceData);
    await waitFor(() => expect(result.current.state?.id).toBe("first"));
    const slow = deferred<EventState>();
    mocks.api.mockImplementation((path: string) =>
      path === "events/second" ? slow.promise : Promise.resolve(first),
    );
    let old!: Promise<void>;
    act(() => {
      old = result.current.selectEvent("second");
    });
    await act(() => result.current.selectEvent("first"));
    await act(async () => {
      slow.resolve(second);
      await old;
    });
    expect(result.current.state?.id).toBe("first");
    expect(localStorage.getItem("eventiq-event")).toBe("first");
  });
  it("does not show an error from an obsolete selection", async () => {
    const { result } = renderHook(useWorkspaceData);
    await waitFor(() => expect(result.current.loading).toBe(false));
    const slow = deferred<EventState>();
    mocks.api.mockImplementation((path: string) =>
      path === "events/second" ? slow.promise : Promise.resolve(first),
    );
    let old!: Promise<void>;
    act(() => {
      old = result.current.selectEvent("second");
    });
    await act(() => result.current.selectEvent("first"));
    await act(async () => {
      slow.reject(new Error("Obsolete error"));
      await old;
    });
    expect(result.current.error).toBe("");
    expect(result.current.loading).toBe(false);
  });
  it("serializes saves and keeps the event selected until the save finishes", async () => {
    const { result } = renderHook(useWorkspaceData);
    await waitFor(() => expect(result.current.loading).toBe(false));
    const slow = deferred<EventState>();
    mocks.api.mockReturnValue(slow.promise);
    let saving!: Promise<boolean>;
    act(() => {
      saving = result.current.mutate("events/first", "PATCH", {
        name: "Renamed",
      });
    });
    await act(async () => {
      expect(await result.current.mutate("events/first", "PATCH", {})).toBe(
        false,
      );
      await result.current.selectEvent("second");
    });
    expect(result.current.state?.id).toBe("first");
    await act(async () => {
      slow.resolve({ ...first, name: "Renamed", version: 2 });
      await saving;
    });
    expect(result.current.events[0].name).toBe("Renamed");
    expect(result.current.busy).toBe(false);
  });
  it("ignores child responses belonging to another event or an older version", async () => {
    const { result } = renderHook(useWorkspaceData);
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.acceptState({ ...first, version: 3 }));
    act(() => result.current.acceptState(second));
    act(() => result.current.acceptState(first));
    expect(result.current.state).toMatchObject({ id: "first", version: 3 });
  });
  it("loads the database workspace when optional selection storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { result } = renderHook(useWorkspaceData);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.state?.id).toBe("first");
    expect(result.current.error).toBe("");
  });
});
