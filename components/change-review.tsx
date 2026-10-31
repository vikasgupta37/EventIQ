"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Undo2, X, History } from "lucide-react";
import { api } from "./api";
import type { EventState } from "@/lib/types";
import type { PlanChange } from "@/lib/management";
export default function ChangeReview({
  state,
  onState,
  compact = false,
}: {
  state: EventState;
  onState: (s: EventState) => void;
  compact?: boolean;
}) {
  const [changes, setChanges] = useState<PlanChange[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    api<PlanChange[]>(`events/${state.id}/changes`)
      .then((data) => {
        if (active) {
          setChanges(data);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [state.id, state.version, state.messages.length]);
  async function act(id: string, action: "apply" | "discard" | "undo") {
    setBusy(true);
    setError("");
    try {
      const next = await api<EventState>(
        `events/${state.id}/changes/${id}/${action}`,
        "POST",
        {},
      );
      onState(next);
      setChanges(await api<PlanChange[]>(`events/${state.id}/changes`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const visible = compact
    ? changes.filter((c) => c.status === "Pending")
    : changes;
  if (compact && !visible.length && !error) return null;
  return (
    <section className="change-review">
      <div className="card-heading">
        <h2>
          <History size={18} />
          {compact ? "Review proposed changes" : "Your plan’s history"}
        </h2>
        {compact && <Link href="/history">View all changes →</Link>}
      </div>
      <p className="muted">
        Previewing never changes your plan. Apply a proposal to save it. Undo is
        available until another edit changes the event.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {loading && <p className="muted">Loading change history…</p>}
      {!loading && !visible.length && (
        <div className="card empty-inline">
          No changes to review yet. Ask the AI Planner to adjust your event.
        </div>
      )}
      {visible.map((c) => (
        <article className="card change-card" key={c.id}>
          <div className="change-heading">
            <div>
              <span
                className={`badge ${c.status === "Pending" ? "amber" : c.status === "Applied" ? "green" : ""}`}
              >
                {c.status}
              </span>
              <small>
                {new Date(c.createdAt).toLocaleString()} · Plan v{c.baseVersion}
              </small>
              <h3>{c.request}</h3>
            </div>
          </div>
          <p className="muted">
            {c.differences.length} changes across{" "}
            {Array.from(new Set(c.differences.map((d) => d.section))).join(
              ", ",
            )}
            .
          </p>
          <details open={c.status === "Pending"}>
            <summary>Before and after</summary>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Change</th>
                    <th>Current / before</th>
                    <th>Proposed / after</th>
                  </tr>
                </thead>
                <tbody>
                  {c.differences.map((d, i) => (
                    <tr key={i}>
                      <td>
                        {d.label}
                        <small>{d.section}</small>
                      </td>
                      <td>{d.before}</td>
                      <td>{d.after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <details>
            <summary>Planner explanation</summary>
            <p className="change-explanation">{c.explanation}</p>
          </details>
          <div className="change-actions">
            {c.status === "Pending" ? (
              <>
                <button
                  className="button small"
                  disabled={busy || c.baseVersion !== state.version}
                  onClick={() => act(c.id, "apply")}
                >
                  <Check size={15} /> Apply changes
                </button>
                <button
                  className="button secondary small"
                  disabled={busy}
                  onClick={() => act(c.id, "discard")}
                >
                  <X size={15} /> Discard
                </button>
                {c.baseVersion !== state.version && (
                  <span className="muted">
                    This preview is out of date. Discard it and ask again.
                  </span>
                )}
              </>
            ) : c.status === "Applied" ? (
              <>
                <button
                  className="button secondary small"
                  disabled={busy || c.appliedVersion !== state.version}
                  onClick={() => act(c.id, "undo")}
                >
                  <Undo2 size={15} /> Undo this change
                </button>
                {c.appliedVersion !== state.version && (
                  <span className="muted">Newer edits prevent undo.</span>
                )}
              </>
            ) : null}
          </div>
        </article>
      ))}
    </section>
  );
}
