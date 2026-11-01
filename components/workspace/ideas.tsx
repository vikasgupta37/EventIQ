"use client";
import { Sparkles, Lightbulb, Users, Leaf } from "lucide-react";
import type { EventState } from "@/lib/types";
import Badge from "./badge";
import { money } from "@/lib/engines";
import { useState } from "react";

export default function Ideas({ state }: { state: EventState }) {
  const [filter, setFilter] = useState("All");
  const fmt = (n: number) => money(n, state.currency);
  return (
    <>
      <div className="idea-filters">
        <button
          className={filter === "All" ? "selected" : ""}
          aria-pressed={filter === "All"}
          onClick={() => setFilter("All")}
        >
          All ideas
        </button>
        {[...new Set(state.recommendations.map((r) => r.category))].map(
          (category) => (
            <button
              key={category}
              className={filter === category ? "selected" : ""}
              aria-pressed={filter === category}
              onClick={() => setFilter(category)}
            >
              {category}
            </button>
          ),
        )}
      </div>
      <div className="ideas-grid">
        {state.recommendations
          .filter((r) => filter === "All" || r.category === filter)
          .map((r, i) => (
            <article className="card idea-card" key={r.id}>
              <div className={`idea-art art-${i % 4}`}>
                <span>
                  {
                    [
                      <Sparkles key="s" />,
                      <Leaf key="l" />,
                      <Lightbulb key="i" />,
                      <Users key="u" />,
                    ][i % 4]
                  }
                </span>
                <i />
                <i />
                <i />
              </div>
              <div className="idea-body">
                <span className="eyebrow">{r.category}</span>
                <h2>{r.idea}</h2>
                <p>{r.reason}</p>
                <small>{r.impact}</small>
                <div>
                  <Badge>{r.priority} priority</Badge>
                  <span>
                    {r.estimatedCost
                      ? `${fmt(r.estimatedCost)} estimated`
                      : "No added cost assumed"}
                  </span>
                </div>
              </div>
            </article>
          ))}
      </div>
    </>
  );
}
