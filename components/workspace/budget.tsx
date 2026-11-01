"use client";
import { Sparkles, Lightbulb } from "lucide-react";
import type { EventState } from "@/lib/types";
import Badge from "./badge";
import { budgetColors as colors } from "../budget-chart";
import { money } from "@/lib/engines";

export default function Budget({
  state,
  mode,
  busy,
  rebalance,
}: {
  state: EventState;
  mode: string;
  busy: boolean;
  rebalance: () => Promise<void>;
}) {
  const spend = state.categories.reduce((sum, c) => sum + c.estimated, 0);
  const fmt = (n: number) => money(n, state.currency);
  return (
    <>
      <div className="budget-summary">
        <div className="card">
          <small>Total budget</small>
          <strong>{fmt(state.budget)}</strong>
        </div>
        <div className="card">
          <small>Estimated spending</small>
          <strong>{fmt(spend)}</strong>
        </div>
        <div className="card">
          <small>Contingency reserve</small>
          <strong>{fmt(state.contingency)}</strong>
        </div>
        <div className="card">
          <small>After spend & reserve</small>
          <strong
            className={
              state.budget - spend - state.contingency < 0 ? "negative" : ""
            }
          >
            {fmt(state.budget - spend - state.contingency)}
          </strong>
        </div>
      </div>
      {spend + state.contingency > state.budget && (
        <div className="notice">
          Your estimates and reserve exceed your target. Compare supplier quotes
          and adjust optional scope.
        </div>
      )}
      <section className="card">
        <div className="card-heading">
          <div>
            <h2>A thoughtful allocation</h2>
            <p className="card-subtitle">
              {mode === "demo"
                ? "Rule-based demo weights"
                : "Personalized planning weights"}{" "}
              · All amounts are estimates
            </p>
          </div>
          <button className="button small" onClick={rebalance} disabled={busy}>
            <Sparkles size={15} />
            {busy ? "Reviewing…" : "AI rebalance"}
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <caption className="sr-only">
              Budget allocations and estimated costs by category
            </caption>
            <thead>
              <tr>
                <th>Category</th>
                <th>Allocated</th>
                <th>Estimated</th>
                <th>Difference</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {state.categories.map((c, i) => (
                <tr key={c.id}>
                  <td>
                    <span
                      className="category-dot"
                      style={{ background: colors[i] }}
                    />
                    {c.name}
                    <small>{c.priority} priority</small>
                  </td>
                  <td>{fmt(c.allocated)}</td>
                  <td>{fmt(c.estimated)}</td>
                  <td className={c.allocated < c.estimated ? "negative" : ""}>
                    {fmt(c.allocated - c.estimated)}
                  </td>
                  <td>
                    <Badge
                      color={c.allocated < c.estimated ? "amber" : "green"}
                    >
                      {c.allocated < c.estimated
                        ? "Review estimate"
                        : "Within allocation"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="notice">
        <Lightbulb size={20} />
        <div>
          <b>Spend on what matters.</b>
          <p>
            Ask the planner to prioritize photography, simplify decor or explore
            a lower budget. Supplier quotes should replace these planning
            assumptions before any commitment.
          </p>
        </div>
      </div>
    </>
  );
}
