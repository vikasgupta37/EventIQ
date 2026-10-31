// @vitest-environment jsdom
import { createElement } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import LiveClock from "../components/live-clock";
import {
  clockDisplay,
  clockFormatters,
  timeZoneKey,
  validTimeZone,
} from "../lib/clock";
beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-31T18:29:59Z"));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
describe("Live time-zone clock", () => {
  it("formats a half-hour zone and the correct calendar date", () => {
    const value = clockDisplay(
      new Date("2026-10-31T20:00:00Z"),
      clockFormatters("Asia/Kolkata"),
    );
    expect(value.time).toBe("01:30:00");
    expect(value.fullDate).toBe("Sunday, 1 November 2026");
    expect(value.offset).toBe("UTC+5:30");
    expect(validTimeZone("not/a-zone")).toBe("system");
  });
  it("uses daylight-saving offsets for each instant, including a repeated hour", () => {
    const formatters = clockFormatters("America/New_York");
    const first = clockDisplay(new Date("2026-11-01T05:30:00Z"), formatters);
    const second = clockDisplay(new Date("2026-11-01T06:30:00Z"), formatters);
    expect(first.time).toBe("01:30:00");
    expect(second.time).toBe("01:30:00");
    expect(first.offset).toBe("UTC-4");
    expect(second.offset).toBe("UTC-5");
  });
  it("ticks across midnight in the saved zone and cleans up its timer", () => {
    localStorage.setItem(timeZoneKey, "Asia/Kolkata");
    const interval = vi.spyOn(window, "setInterval");
    const clearInterval = vi.spyOn(window, "clearInterval");
    const view = render(createElement(LiveClock));
    expect(screen.getByText("23:59:59")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("00:00:00")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Choose time zone" }));
    expect(screen.getByText("Sunday, 1 November 2026")).toBeTruthy();
    view.unmount();
    expect(clearInterval).toHaveBeenCalledWith(interval.mock.results[0].value);
  });
  it("saves a zone, restores it on remount, and closes on Escape", () => {
    const view = render(createElement(LiveClock));
    const trigger = screen.getByRole("button", { name: "Choose time zone" });
    fireEvent.click(trigger);
    fireEvent.change(screen.getByLabelText("Time zone"), {
      target: { value: "UTC" },
    });
    expect(localStorage.getItem(timeZoneKey)).toBe("UTC");
    expect(screen.getByText("18:29:59")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByLabelText("Time zone")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    view.unmount();
    render(createElement(LiveClock));
    fireEvent.click(screen.getByRole("button", { name: "Choose time zone" }));
    expect(screen.getByLabelText("Time zone")).toHaveProperty("value", "UTC");
  });
  it("synchronizes another tab's choice and refreshes immediately when the page is visible", () => {
    render(createElement(LiveClock));
    act(() =>
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: timeZoneKey,
          newValue: "Asia/Kolkata",
        }),
      ),
    );
    expect(screen.getByText("23:59:59")).toBeTruthy();
    act(() => {
      vi.setSystemTime(new Date("2026-11-01T01:00:00Z"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(screen.getByText("06:30:00")).toBeTruthy();
  });
  it("still changes time zone if browser storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Blocked");
    });
    render(createElement(LiveClock));
    fireEvent.click(screen.getByRole("button", { name: "Choose time zone" }));
    fireEvent.change(screen.getByLabelText("Time zone"), {
      target: { value: "Asia/Kolkata" },
    });
    expect(screen.getByText("23:59:59")).toBeTruthy();
  });
});
