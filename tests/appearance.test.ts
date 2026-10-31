// @vitest-environment jsdom
import { createElement, Fragment } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppearanceSelect, { AppearanceSync } from "../components/appearance";
import { appearanceBootstrap, appearanceKey } from "../lib/appearance";
let dark = false;
let listeners: Set<() => void>;
function mount() {
  return render(
    createElement(
      Fragment,
      {},
      createElement(AppearanceSync),
      createElement(AppearanceSelect),
    ),
  );
}
beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.appearance;
  dark = false;
  listeners = new Set();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      get matches() {
        return dark;
      },
      addEventListener: (_event: string, listener: () => void) =>
        listeners.add(listener),
      removeEventListener: (_event: string, listener: () => void) =>
        listeners.delete(listener),
    })),
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("Appearance preferences", () => {
  it("resolves the stored preference before hydration, with an invalid value falling back to the system", () => {
    localStorage.setItem(appearanceKey, "dark");
    Function(appearanceBootstrap)();
    expect(document.documentElement.dataset.theme).toBe("dark");
    localStorage.setItem(appearanceKey, "unknown");
    Function(appearanceBootstrap)();
    expect(document.documentElement.dataset.appearance).toBe("system");
    expect(document.documentElement.dataset.theme).toBe("light");
    dark = true;
    Function(appearanceBootstrap)();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
  it("persists an explicit choice and restores it on remount", async () => {
    const view = mount();
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Color theme" }),
      "dark",
    );
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem(appearanceKey)).toBe("dark");
    view.unmount();
    mount();
    expect(
      screen.getByRole("combobox", { name: "Color theme" }),
    ).toHaveProperty("value", "dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
  it("follows device changes only in System mode and removes its listeners", async () => {
    const view = mount();
    expect(document.documentElement.dataset.theme).toBe("light");
    act(() => {
      dark = true;
      listeners.forEach((listener) => listener());
    });
    expect(document.documentElement.dataset.theme).toBe("dark");
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Color theme" }),
      "light",
    );
    act(() => listeners.forEach((listener) => listener()));
    expect(document.documentElement.dataset.theme).toBe("light");
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Color theme" }),
      "system",
    );
    expect(document.documentElement.dataset.theme).toBe("dark");
    view.unmount();
    expect(listeners.size).toBe(0);
  });
  it("synchronizes changes from another tab and handles preference removal", () => {
    mount();
    act(() =>
      window.dispatchEvent(
        new StorageEvent("storage", { key: appearanceKey, newValue: "dark" }),
      ),
    );
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(
      screen.getByRole("combobox", { name: "Color theme" }),
    ).toHaveProperty("value", "dark");
    act(() =>
      window.dispatchEvent(
        new StorageEvent("storage", { key: appearanceKey, newValue: null }),
      ),
    );
    expect(document.documentElement.dataset.appearance).toBe("system");
    expect(document.documentElement.dataset.theme).toBe("light");
  });
  it("still switches themes when browser storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Storage disabled");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage disabled");
    });
    expect(() => Function(appearanceBootstrap)()).not.toThrow();
    mount();
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Color theme" }),
      "dark",
    );
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
