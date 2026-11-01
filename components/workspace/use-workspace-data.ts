"use client";
import { useEffect, useRef, useState } from "react";
import type { EventState } from "@/lib/types";
import { api } from "../api";
import type { EventSummary } from "./types";

const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";

/** Owns the current event and rejects responses from older selections. */
export function useWorkspaceData() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [state, setState] = useState<EventState | null>(null);
  const [mode, setMode] = useState("demo");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const selection = useRef(0);
  const selectedId = useRef<string | null>(null);
  const selectedVersion = useRef(0);
  const pending = useRef(false);
  const network = useRef<AbortController | null>(null);

  useEffect(() => {
    const lifecycle = selection;
    const generation = ++selection.current;
    const controller = new AbortController();
    network.current = controller;
    async function load() {
      try {
        const result = await api<{ events: EventSummary[]; mode: string }>(
          "events",
          "GET",
          undefined,
          { signal: controller.signal },
        );
        if (generation !== selection.current) return;
        setEvents(result.events);
        setMode(result.mode);
        // Selection preferences are optional; blocked storage must not break DB mode.
        let stored: string | null = null;
        try {
          stored = localStorage.getItem("eventiq-event");
        } catch {
          /* optional */
        }
        const id =
          result.events.find((e) => e.id === stored)?.id ??
          result.events[0]?.id;
        selectedId.current = id ?? null;
        if (id) {
          const next = await api<EventState>(`events/${id}`, "GET", undefined, {
            signal: controller.signal,
          });
          if (generation === selection.current) {
            selectedVersion.current = next.version;
            setState(next);
          }
        }
      } catch (cause) {
        if (generation === selection.current) setError(errorMessage(cause));
      } finally {
        if (generation === selection.current) setLoading(false);
      }
    }
    void load();
    return () => {
      lifecycle.current++;
      network.current?.abort();
    };
  }, []);

  async function selectEvent(id: string) {
    // Mutations are serialized; never switch the visible event during a save.
    if (pending.current) return;
    const generation = ++selection.current;
    network.current?.abort();
    const controller = new AbortController();
    network.current = controller;
    selectedId.current = id;
    setState(null);
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const next = await api<EventState>(`events/${id}`, "GET", undefined, {
        signal: controller.signal,
      });
      if (generation !== selection.current) return;
      selectedVersion.current = next.version;
      setState(next);
      try {
        localStorage.setItem("eventiq-event", id);
      } catch {
        /* optional */
      }
    } catch (cause) {
      if (generation === selection.current) setError(errorMessage(cause));
    } finally {
      if (generation === selection.current) setLoading(false);
    }
  }

  function acceptState(next: EventState) {
    if (
      next.id !== selectedId.current ||
      next.version < selectedVersion.current
    )
      return;
    selectedVersion.current = next.version;
    setState((current) =>
      current && next.version < current.version ? current : next,
    );
    setEvents((current) =>
      current.map((event) =>
        event.id === next.id
          ? {
              id: next.id,
              name: next.name,
              date: next.date,
              eventType: next.eventType,
            }
          : event,
      ),
    );
  }

  async function run<T>(
    operation: (signal: AbortSignal) => Promise<T>,
    apply: (result: T) => void,
  ): Promise<T | null> {
    if (pending.current || loading || !selectedId.current) return null;
    const generation = selection.current;
    const controller = new AbortController();
    network.current = controller;
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await operation(controller.signal);
      if (generation !== selection.current) return null;
      apply(result);
      return result;
    } catch (cause) {
      if (generation === selection.current) setError(errorMessage(cause));
      return null;
    } finally {
      pending.current = false;
      if (generation === selection.current) setBusy(false);
    }
  }

  async function mutate(path: string, method: string, body?: unknown) {
    return (
      (await run(
        (signal) => api<EventState>(path, method, body, { signal }),
        acceptState,
      )) !== null
    );
  }
  async function requestPlan(message: string) {
    const result = await run(
      (signal) =>
        api<{ state: EventState; mode: string }>(
          `events/${selectedId.current}/chat`,
          "POST",
          { message },
          { signal },
        ),
      (result) => {
        acceptState(result.state);
        setMode(result.mode);
        setNotice("Your planner has reviewed the request.");
      },
    );
    return result?.state ?? null;
  }
  async function rebalance() {
    await run(
      (signal) =>
        api<{ state: EventState }>(
          `events/${selectedId.current}/budget/rebalance`,
          "POST",
          {},
          { signal },
        ),
      (result) => {
        acceptState(result.state);
        setNotice(
          "Budget changes are ready to review below. Apply the preview to save them.",
        );
      },
    );
  }
  return {
    events,
    state,
    mode,
    loading,
    busy,
    error,
    setError,
    notice,
    setNotice,
    selectEvent,
    mutate,
    requestPlan,
    rebalance,
    acceptState,
  };
}
