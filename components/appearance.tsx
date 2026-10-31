"use client";
import { useEffect, useSyncExternalStore } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import {
  appearanceKey,
  validAppearance,
  type Appearance,
} from "@/lib/appearance";
const changeEvent = "eventiq-appearance-change";
const query = "(prefers-color-scheme: dark)";
function current() {
  return validAppearance(document.documentElement.dataset.appearance);
}
function subscribe(callback: () => void) {
  window.addEventListener(changeEvent, callback);
  return () => window.removeEventListener(changeEvent, callback);
}
function apply(preference: Appearance) {
  const root = document.documentElement;
  root.dataset.appearance = preference;
  root.dataset.theme =
    preference === "system"
      ? window.matchMedia?.(query).matches
        ? "dark"
        : "light"
      : preference;
  window.dispatchEvent(new Event(changeEvent));
}
export function AppearanceSync() {
  useEffect(() => {
    let saved: Appearance = "system";
    try {
      saved = validAppearance(localStorage.getItem(appearanceKey));
    } catch {
      /* Storage may be disabled. */
    }
    apply(saved);
    const media = window.matchMedia?.(query);
    const updateSystem = () => {
      if (current() === "system") apply("system");
    };
    const updateStorage = (event: StorageEvent) => {
      if (event.key === appearanceKey || event.key === null)
        apply(validAppearance(event.newValue));
    };
    media?.addEventListener("change", updateSystem);
    window.addEventListener("storage", updateStorage);
    return () => {
      media?.removeEventListener("change", updateSystem);
      window.removeEventListener("storage", updateStorage);
    };
  }, []);
  return null;
}
export default function AppearanceSelect() {
  const appearance = useSyncExternalStore(
    subscribe,
    current,
    () => "system" as const,
  );
  const Icon =
    appearance === "dark" ? Moon : appearance === "light" ? Sun : Monitor;
  return (
    <label className="appearance-select">
      <Icon size={15} aria-hidden="true" />
      <span className="sr-only">Color theme</span>
      <select
        value={appearance}
        onChange={(event) => {
          const next = validAppearance(event.target.value);
          apply(next);
          try {
            localStorage.setItem(appearanceKey, next);
          } catch {
            /* Keep the selection for this visit. */
          }
        }}
        title="Choose Light, Dark, or follow your system"
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </label>
  );
}
