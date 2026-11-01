"use client";
import { Plus } from "lucide-react";
import type { EventState, Task } from "@/lib/types";
import type { Mutate } from "./types";
import TaskRows from "./task-rows";
import { useState } from "react";

export default function Tasks({
  state,
  busy,
  mutate,
  onEdit,
}: {
  state: EventState;
  busy: boolean;
  mutate: Mutate;
  onEdit: (task: Partial<Task>) => void;
}) {
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("date");
  return (
    <section className="card">
      <div className="card-heading">
        <div className="filters">
          <select
            aria-label="Filter tasks"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {["All", "Not Started", "In Progress", "Completed", "Blocked"].map(
              (s) => (
                <option key={s}>{s}</option>
              ),
            )}
          </select>
          <select
            aria-label="Sort tasks"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="date">By due date</option>
            <option value="priority">By priority</option>
            <option value="title">By title</option>
          </select>
        </div>
        <button
          className="button small"
          onClick={() => onEdit({ dueDate: state.date })}
        >
          <Plus size={16} /> Add task
        </button>
      </div>
      <div className="task-list">
        <TaskRows
          busy={busy}
          mutate={mutate}
          editable
          onEdit={onEdit}
          tasks={state.tasks
            .filter((t) => filter === "All" || t.status === filter)
            .sort((a, b) =>
              sort === "title"
                ? a.title.localeCompare(b.title)
                : sort === "priority"
                  ? ["High", "Medium", "Low"].indexOf(a.priority) -
                    ["High", "Medium", "Low"].indexOf(b.priority)
                  : a.dueDate.localeCompare(b.dueDate),
            )}
        />
      </div>
      {!state.tasks.some((t) => filter === "All" || t.status === filter) && (
        <p className="empty-inline">No tasks match this filter.</p>
      )}
    </section>
  );
}
