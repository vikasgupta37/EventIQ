import { afterEach, describe, expect, it, vi } from "vitest";
import { withAIExecution } from "../lib/agent/execution";
import { PublicRequestGate } from "../lib/server/public-request-gate";

afterEach(() => vi.useRealTimers());
describe("AI execution budgets", () => {
  it("never starts work for an already cancelled request", async () => {
    const operation = vi.fn();
    const parent = new AbortController();
    parent.abort();
    await expect(
      withAIExecution(parent.signal, operation),
    ).rejects.toMatchObject({ status: 408 });
    expect(operation).not.toHaveBeenCalled();
  });
  it("aborts a hung provider at the total deadline and clears its timer", async () => {
    vi.useFakeTimers();
    let providerSignal!: AbortSignal;
    const pending = withAIExecution(
      undefined,
      (signal) => {
        providerSignal = signal;
        return new Promise(() => {});
      },
      100,
    );
    const checked = expect(pending).rejects.toMatchObject({ status: 504 });
    await vi.advanceTimersByTimeAsync(100);
    await checked;
    expect(providerSignal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("propagates client cancellation even when a provider ignores it", async () => {
    vi.useFakeTimers();
    const parent = new AbortController();
    let providerSignal!: AbortSignal;
    const pending = withAIExecution(parent.signal, (signal) => {
      providerSignal = signal;
      return new Promise(() => {});
    });
    const checked = expect(pending).rejects.toMatchObject({ status: 408 });
    parent.abort();
    await checked;
    expect(providerSignal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("cleans up successful calls and retains genuine provider errors", async () => {
    vi.useFakeTimers();
    expect(await withAIExecution(undefined, async () => 42)).toBe(42);
    await expect(
      withAIExecution(undefined, async () => {
        throw new Error("Provider failed");
      }),
    ).rejects.toThrow("Provider failed");
    expect(vi.getTimerCount()).toBe(0);
  });
});
describe("Public instance capacity", () => {
  it("caps simultaneous requests and releases slots once", () => {
    const gate = new PublicRequestGate();
    const first = gate.acquire("a");
    const second = gate.acquire("a");
    expect(() => gate.acquire("a")).toThrow("other requests");
    const third = gate.acquire("b");
    const fourth = gate.acquire("b");
    expect(() => gate.acquire("c")).toThrow("other requests");
    first();
    first();
    const replacement = gate.acquire("c");
    expect(() => gate.acquire("d")).toThrow("other requests");
    second();
    third();
    fourth();
    replacement();
    expect(() => gate.acquire("d")).not.toThrow();
  });
  it("keeps active capacity reserved across rate-window rollover", () => {
    const gate = new PublicRequestGate();
    const release = gate.acquire("a");
    gate.acquire("a");
    gate.count("a", 60000);
    gate.count("a", 120000);
    expect(() => gate.acquire("a")).toThrow("other requests");
    release();
    expect(() => gate.acquire("a")).not.toThrow();
  });
  it("bounds unique IP memory as well as repeated requests", () => {
    const gate = new PublicRequestGate();
    for (let i = 0; i < 10000; i++) gate.count(String(i), 60000);
    expect(() => gate.count("overflow", 60000)).toThrow("busy");
    expect(() => gate.count("overflow", 120000)).not.toThrow();
  });
});
