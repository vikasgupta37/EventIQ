"use client";
import { Check, Trash2, Pencil } from "lucide-react";
import type { Task } from "@/lib/types";
import type { Mutate } from "./types";
import Badge from "./badge";
import { shortDate } from "./dates";

export default function TaskRows({
  tasks,
  busy,
  mutate,
  editable = false,
  onEdit,
}: {
  tasks: Task[];
  busy: boolean;
  mutate: Mutate;
  editable?: boolean;
  onEdit?: (task: Partial<Task>) => void;
}) {
  return tasks.map((t) => (
    <div className="task-row" key={t.id}>
      <button
        className={`task-check ${t.status === "Completed" ? "checked" : ""}`}
        disabled={busy}
        aria-label={`${t.status === "Completed" ? "Reopen" : "Complete"} ${t.title}`}
        onClick={() =>
          mutate(`tasks/${t.id}`, "PATCH", {
            status: t.status === "Completed" ? "Not Started" : "Completed",
          })
        }
      >
        {t.status === "Completed" && <Check size={13} />}
      </button>
      <div className="task-name">
        <b>{t.title}</b>
        <span>
          {t.category} <i>·</i> {t.owner}
        </span>
      </div>
      <Badge color={t.priority === "High" ? "amber" : ""}>{t.priority}</Badge>
      <span className="task-date">{shortDate(t.dueDate)}</span>
      {editable && (
        <>
          <select
            aria-label={`Status of ${t.title}`}
            disabled={busy}
            value={t.status}
            onChange={(e) =>
              mutate(`tasks/${t.id}`, "PATCH", { status: e.target.value })
            }
          >
            {["Not Started", "In Progress", "Completed", "Blocked"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button
            className="icon-button"
            aria-label={`Edit ${t.title}`}
            onClick={() => onEdit?.(t)}
          >
            <Pencil size={15} />
          </button>
          <button
            className="icon-button"
            disabled={busy}
            aria-label={`Delete ${t.title}`}
            onClick={() => {
              if (confirm(`Delete “${t.title}”?`))
                void mutate(`tasks/${t.id}`, "DELETE");
            }}
          >
            <Trash2 size={15} />
          </button>
        </>
      )}
    </div>
  ));
}
