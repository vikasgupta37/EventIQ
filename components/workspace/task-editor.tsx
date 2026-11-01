"use client";
import type { EventState, Task } from "@/lib/types";
import type { Mutate } from "./types";
import Dialog from "../ui/dialog";

export default function TaskEditor({
  state,
  busy,
  error,
  mutate,
  onClose,
  taskEditor,
}: {
  state: EventState;
  busy: boolean;
  error: string;
  mutate: Mutate;
  onClose: () => void;
  taskEditor: Partial<Task>;
}) {
  return (
    <Dialog
      title={<>{taskEditor.id ? "Edit task" : "A new step in the plan"}</>}
      closeLabel="Close task editor"
      onClose={onClose}
    >
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const payload = {
            title: String(data.get("title")),
            description: String(data.get("description")),
            category: String(data.get("category")),
            priority: String(data.get("priority")),
            dueDate: String(data.get("dueDate")),
            owner: String(data.get("owner")),
            estimatedCost: Number(data.get("estimatedCost")),
          };
          if (
            await mutate(
              taskEditor.id
                ? `tasks/${taskEditor.id}`
                : `events/${state.id}/tasks`,
              taskEditor.id ? "PATCH" : "POST",
              payload,
            )
          )
            onClose();
        }}
      >
        <label>
          Task title
          <input name="title" required defaultValue={taskEditor.title} />
        </label>
        <label>
          Description
          <textarea name="description" defaultValue={taskEditor.description} />
        </label>
        <div className="form-grid">
          <label>
            Category
            <input
              name="category"
              required
              defaultValue={taskEditor.category ?? "Planning"}
            />
          </label>
          <label>
            Priority
            <select
              name="priority"
              defaultValue={taskEditor.priority ?? "Medium"}
            >
              {["High", "Medium", "Low"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label>
            Due date
            <input
              name="dueDate"
              type="date"
              required
              max={state.date}
              defaultValue={taskEditor.dueDate}
            />
          </label>
          <label>
            Owner
            <input name="owner" defaultValue={taskEditor.owner ?? "You"} />
          </label>
          <label>
            Estimated cost
            <input
              name="estimatedCost"
              type="number"
              min={0}
              defaultValue={taskEditor.estimatedCost ?? 0}
            />
          </label>
        </div>
        <button className="button" disabled={busy}>
          {busy ? "Saving…" : "Save task"}
        </button>
      </form>
    </Dialog>
  );
}
