"use client";
import { Store } from "lucide-react";
import type { EventState } from "@/lib/types";
import type { Mutate } from "./types";
import { money } from "@/lib/engines";
import { longDate } from "./dates";

export default function Vendors({
  state,
  busy,
  mutate,
}: {
  state: EventState;
  busy: boolean;
  mutate: Mutate;
}) {
  const fmt = (n: number) => money(n, state.currency);
  return (
    <>
      <div className="notice">
        <Store size={20} />
        <div>
          <b>Your service checklist</b>
          <p>
            These are service requirements, not supplier listings. Collect
            verified quotes and only mark a service booked after confirmation.
          </p>
        </div>
      </div>
      <div className="vendor-grid">
        {state.vendors.map((v) => (
          <section className="card vendor-card" key={v.id}>
            <div className="card-heading">
              <span className="service-icon">
                <Store size={21} />
              </span>
              <select
                aria-label={`${v.name} status`}
                disabled={busy}
                value={v.status}
                onChange={(e) =>
                  mutate(`vendors/${v.id}`, "PATCH", {
                    status: e.target.value,
                  })
                }
              >
                {[
                  "Needed",
                  "Shortlisted",
                  "Contacted",
                  "Booked",
                  "Rejected",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <h2>{v.name}</h2>
            <div className="vendor-estimate">
              {fmt(v.estimatedCost)} <span>planning estimate</span>
            </div>
            <p className="muted">Book by {longDate(v.bookingDeadline)}</p>
            <h3>What to look for</h3>
            <ul>
              {v.selectionCriteria.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <details>
              <summary>Questions to ask</summary>
              <ul>
                {v.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </details>
            <label className="vendor-notes">
              Your notes
              <textarea
                key={`${v.id}-${v.notes}`}
                defaultValue={v.notes}
                placeholder="Shortlisted suppliers, quote details…"
                rows={2}
                onBlur={(e) => {
                  if (e.target.value !== v.notes)
                    void mutate(`vendors/${v.id}`, "PATCH", {
                      notes: e.target.value,
                    });
                }}
              />
            </label>
          </section>
        ))}
      </div>
    </>
  );
}
