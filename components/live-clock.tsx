"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Clock3, ChevronDown, Globe2 } from "lucide-react";
import {
  availableTimeZones,
  clockDisplay,
  clockFormatters,
  deviceTimeZone,
  timeZoneKey,
  validTimeZone,
  zoneLabel,
} from "@/lib/clock";
const subscribeToHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
export default function LiveClock() {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    clientSnapshot,
    serverSnapshot,
  );
  if (!hydrated)
    return (
      <div className="live-clock">
        <span className="live-clock-trigger">Live local time</span>
      </div>
    );
  return <ClientClock />;
}
function ClientClock() {
  const [now, setNow] = useState<Date>(() => new Date());
  const [preference, setPreference] = useState(() => {
    try {
      return validTimeZone(localStorage.getItem(timeZoneKey));
    } catch {
      return "system";
    }
  });
  const [device, setDevice] = useState(deviceTimeZone);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const select = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    const tick = () => {
      setNow(new Date());
      setDevice(deviceTimeZone());
    };
    const interval = window.setInterval(tick, 1000);
    const sync = (event: StorageEvent) => {
      if (event.key === timeZoneKey || event.key === null)
        setPreference(validTimeZone(event.newValue));
    };
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("storage", sync);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("storage", sync);
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    select.current?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  const zone = preference === "system" ? device : preference;
  const formatters = useMemo(() => clockFormatters(zone), [zone]);
  const options = useMemo(
    () => [
      ...new Set([
        ...availableTimeZones(device),
        ...(preference === "system" ? [] : [preference]),
      ]),
    ],
    [device, preference],
  );
  const display = now ? clockDisplay(now, formatters) : null;
  return (
    <div className="live-clock" ref={root}>
      <button
        ref={trigger}
        className="live-clock-trigger"
        aria-label="Choose time zone"
        aria-expanded={open}
        aria-controls="live-clock-settings"
        onClick={() => setOpen(!open)}
      >
        <Clock3 size={16} aria-hidden="true" />
        <span aria-live="off">
          <time dateTime={now?.toISOString()}>{display?.time ?? "—:—:—"}</time>
          <small>
            {display
              ? `${display.date} · ${zoneLabel(zone)}`
              : "Live local time"}
          </small>
        </span>
        <ChevronDown size={12} aria-hidden="true" />
      </button>
      {open && (
        <section
          className="clock-popover"
          id="live-clock-settings"
          aria-label="Live clock settings"
        >
          <div className="clock-popover-heading">
            <Globe2 size={18} />
            <h2>Your time, wherever you are</h2>
          </div>
          <p className="clock-full-date">
            {display?.fullDate ?? "Loading local time…"}
          </p>
          <label>
            Time zone
            <select
              ref={select}
              value={preference}
              onChange={(event) => {
                const next = validTimeZone(event.target.value);
                setPreference(next);
                try {
                  localStorage.setItem(timeZoneKey, next);
                } catch {
                  /* Selection still works for this visit. */
                }
              }}
            >
              <option value="system">
                Device time zone ({device.replaceAll("_", " ")})
              </option>
              {options.map((option) => (
                <option key={option} value={option}>
                  {option.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <div className="clock-zone-meta">
            <span className="live-dot" />
            <span>
              {zoneLabel(zone)} · {display?.offset ?? "UTC"}
            </span>
            <span>Live · 24-hour</span>
          </div>
          <p className="muted">
            Used for this live clock. Your choice is saved in this browser.
          </p>
        </section>
      )}
    </div>
  );
}
