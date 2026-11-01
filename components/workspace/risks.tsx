"use client";
import { ShieldAlert, Check } from "lucide-react";
import type { EventState } from "@/lib/types";
import Badge from "./badge";

export default function Risks({ state }: { state: EventState }) {
  return (
    <div className="risks-list">
      {state.risks.map((r) => (
        <section className="card risk-card" key={r.id}>
          <span className={`risk-icon ${r.severity === "High" ? "high" : ""}`}>
            <ShieldAlert size={23} />
          </span>
          <div>
            <div className="risk-title">
              <h2>{r.title}</h2>
              <Badge color={r.severity === "High" ? "red" : "amber"}>
                {r.severity} severity
              </Badge>
            </div>
            <p>{r.reason}</p>
            <div className="risk-facts">
              <span>
                Probability: <b>{r.probability}</b>
              </span>
              <span>Impact: {r.impact}</span>
            </div>
            <div className="risk-action">
              <Check size={16} />
              <span>{r.action}</span>
            </div>
          </div>
        </section>
      ))}
      {!state.risks.length && (
        <div className="empty-state">
          <Check size={40} />
          <h2>No current risk flags.</h2>
          <p>Keep quotes and booking statuses up to date.</p>
        </div>
      )}
    </div>
  );
}
