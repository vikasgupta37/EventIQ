"use client";
import { Check } from "lucide-react";
import type { EventState } from "@/lib/types";
import Badge from "./badge";
import { daysUntil } from "@/lib/engines";
import { shortDate } from "./dates";

export default function Timeline({ state }: { state: EventState }) {
  return (
    <section className="card full-timeline">
      {state.timeline.map((t, i) => (
        <article key={t.id}>
          <div className="milestone-date">
            <b>{shortDate(t.dueDate)}</b>
            <span>{daysUntil(t.dueDate)} days from now</span>
          </div>
          <span
            className={`milestone-number ${t.status === "Completed" ? "done" : ""}`}
          >
            {t.status === "Completed" ? (
              <Check size={17} />
            ) : (
              String(i + 1).padStart(2, "0")
            )}
          </span>
          <div className="milestone-content">
            <Badge color={t.priority === "High" ? "amber" : ""}>
              {t.priority} priority
            </Badge>
            <h2>{t.title}</h2>
            <p>
              {t.category} · {t.status}
            </p>
            {t.dependencies.length > 0 && (
              <small>
                After:{" "}
                {t.dependencies
                  .map(
                    (d) =>
                      state.tasks.find((task) => task.id === d)?.title ?? d,
                  )
                  .join(", ")}
              </small>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
