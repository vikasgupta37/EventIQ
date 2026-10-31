import type { Task } from "./types";
export function validateTaskGraph(tasks: Task[], eventDate: string) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  function visit(task: Task) {
    if (visiting.has(task.id))
      throw new Error("Task dependencies cannot contain a cycle.");
    if (visited.has(task.id)) return;
    visiting.add(task.id);
    if (task.dueDate > eventDate)
      throw new Error("Task deadlines must be on or before the event.");
    for (const id of task.dependencies) {
      const dependency = byId.get(id);
      if (!dependency) throw new Error("Unknown task dependency.");
      visit(dependency);
      if (dependency.dueDate > task.dueDate)
        throw new Error("A task cannot be due before its dependencies.");
    }
    visiting.delete(task.id);
    visited.add(task.id);
  }
  tasks.forEach(visit);
}
