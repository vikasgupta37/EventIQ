import { z } from "zod";
import {
  create_event_plan,
  generate_timeline,
  identify_risks,
  today,
} from "./engines";
import {
  eventSchema,
  eventPatchSchema,
  taskSchema,
  taskPatchSchema,
  vendorPatchSchema,
} from "./validation";
import {
  guestSchema,
  expenseSchema,
  paymentSchema,
  type Guest,
  type Expense,
  type PlanChange,
} from "./management";
import { eventStateSchema } from "./event-state-schema";
import { planDifferences } from "./changes";
import { validateTaskGraph } from "./tasks";
import type { EventState, Action } from "./types";

export const browserDataKey = "eventiq-browser-data-v1";
type StoredChange = PlanChange & {
  before: EventState;
  after: EventState;
  actions: Action[];
};
type RecordData = {
  state: EventState;
  guests: Guest[];
  expenses: Expense[];
  changes: StoredChange[];
};
type Store = { format: 1; events: RecordData[] };
const storedSchema = z.object({
  format: z.literal(1),
  events: z
    .array(
      z.object({
        state: eventStateSchema,
        guests: z.array(guestSchema.extend({ id: z.string() })).max(2000),
        expenses: z
          .array(
            expenseSchema.extend({
              id: z.string(),
              payments: z
                .array(paymentSchema.extend({ id: z.string() }))
                .max(1000),
            }),
          )
          .max(1000),
        changes: z
          .array(
            z.object({
              id: z.string(),
              status: z.enum(["Pending", "Applied", "Discarded", "Undone"]),
              baseVersion: z.number().int(),
              appliedVersion: z.number().int().nullable(),
              request: z.string(),
              explanation: z.string(),
              differences: z.array(
                z.object({
                  section: z.string(),
                  label: z.string(),
                  before: z.string(),
                  after: z.string(),
                }),
              ),
              createdAt: z.string(),
              before: eventStateSchema,
              after: eventStateSchema,
              actions: z.array(
                z.object({ tool: z.string(), summary: z.string() }),
              ),
            }),
          )
          .max(20),
      }),
    )
    .max(30),
});
function read(): Store {
  let raw: string | null;
  try {
    raw = localStorage.getItem(browserDataKey);
  } catch {
    throw new Error(
      "Browser storage is unavailable. Allow site storage to save your plans.",
    );
  }
  if (!raw) return { format: 1, events: [] };
  try {
    return storedSchema.parse(JSON.parse(raw));
  } catch {
    throw new Error(
      "Saved browser data could not be read. Export a backup before clearing this site's data.",
    );
  }
}
function write(store: Store) {
  storedSchema.parse(store);
  try {
    localStorage.setItem(browserDataKey, JSON.stringify(store));
  } catch {
    throw new Error(
      "Your browser could not save this change. Export a backup and free space or remove older events, then try again.",
    );
  }
}
let queue: Promise<unknown> = Promise.resolve();
function locked<T>(operation: () => T): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks)
    return navigator.locks.request("eventiq-browser-data", operation);
  const result = queue.then(operation);
  queue = result.catch(() => {});
  return result;
}
function edit<T>(operation: (store: Store) => T): Promise<T> {
  return locked(() => {
    const store = read();
    const result = operation(store);
    write(store);
    return structuredClone(result);
  });
}
function found<T>(item: T | undefined, label: string): T {
  if (!item) throw new Error(label + " not found in this browser.");
  return item;
}
function record(store: Store, id: string) {
  return found(
    store.events.find((e) => e.state.id === id),
    "Event",
  );
}
function finish(record: RecordData, state = record.state) {
  validateTaskGraph(state.tasks, state.date);
  for (const c of state.categories) {
    const v = state.vendors.find((v) => v.name === c.name);
    if (v) c.estimated = v.estimatedCost;
  }
  state.timeline = generate_timeline(state.tasks);
  state.risks = identify_risks(state);
  state.progress = Math.round(
    (state.tasks.filter((t) => t.status === "Completed").length /
      Math.max(1, state.tasks.length)) *
      100,
  );
  state.version = record.state.version + 1;
  state.updatedAt = new Date().toISOString();
  record.state = state;
  return state;
}
const uid = () => crypto.randomUUID();
function snapshot(state: EventState) {
  return { ...structuredClone(state), messages: [], actions: [] };
}
async function remote<T>(endpoint: string, body: unknown): Promise<T> {
  const response = await fetch("/api/demo/" + endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const result = await response
    .json()
    .catch(() => ({ error: "The planner could not be reached." }));
  if (!response.ok) throw new Error(result.error || "Please try again.");
  return result;
}
async function plan(id: string, message: string) {
  const initial = record(read(), id).state;
  const result = await remote<{
    state: EventState;
    reply: string;
    actions: Action[];
    mode: string;
  }>("plan", {
    state: { ...initial, messages: initial.messages.slice(-12), actions: [] },
    message,
  });
  const after = eventStateSchema.parse(result.state);
  if (after.id !== id)
    throw new Error(
      "The planner returned a different event. No changes were saved.",
    );
  return edit((store) => {
    const item = record(store, id);
    const current = item.state;
    if (current.version !== initial.version)
      throw new Error(
        "Your event changed while the planner was thinking. Please ask again.",
      );
    const differences = planDifferences(current, after);
    const reply = differences.length
      ? "Proposed changes — not applied yet. Review and apply the preview.\n\n" +
        result.reply
      : result.reply;
    const change: StoredChange | null = differences.length
      ? {
          id: uid(),
          status: "Pending",
          baseVersion: current.version,
          appliedVersion: null,
          request: message,
          explanation: result.reply,
          differences,
          createdAt: new Date().toISOString(),
          before: snapshot(current),
          after: snapshot(after),
          actions: result.actions,
        }
      : null;
    if (change) item.changes = [change, ...item.changes].slice(0, 20);
    current.messages = [
      ...current.messages,
      { role: "user", content: message },
      { role: "assistant", content: reply },
    ].slice(-200);
    return { state: current, mode: result.mode, reply, proposal: change };
  });
}
export function exportBrowserData() {
  return (
    localStorage.getItem(browserDataKey) ||
    JSON.stringify({ format: 1, events: [] })
  );
}
export async function importBrowserData(raw: string) {
  if (raw.length > 5 * 1024 * 1024) throw new Error("Backup exceeds 5 MB.");
  let imported: Store;
  try {
    imported = storedSchema.parse(JSON.parse(raw));
  } catch {
    throw new Error("This is not a valid EventIQ browser backup.");
  }
  if (
    new Set(imported.events.map((e) => e.state.id)).size !==
    imported.events.length
  )
    throw new Error("Backup contains duplicate events.");
  await edit((store) => {
    const ids = new Set(store.events.map((e) => e.state.id));
    if (imported.events.some((e) => ids.has(e.state.id)))
      throw new Error(
        "An event in this backup already exists. Import into a different browser or remove that event first.",
      );
    store.events.push(...imported.events);
  });
}
export async function browserApi<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const [resource, id, section, itemId, action, paymentId] = path.split("/");
  if (resource === "extract" && method === "POST")
    return remote<T>("extract", body);
  if (
    resource === "events" &&
    id &&
    method === "POST" &&
    (section === "chat" ||
      section === "plan" ||
      (section === "budget" && itemId === "rebalance"))
  ) {
    const message =
      section === "chat"
        ? z.object({ message: z.string().trim().min(1).max(6000) }).parse(body)
            .message
        : "Rebalance and personalize the complete event plan using my current requirements.";
    return (await plan(id, message)) as T;
  }
  if (method === "GET") {
    const store = read();
    if (resource === "events" && !id) {
      const health = await fetch("/api/health", {
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      return {
        events: store.events.map((e) => ({
          id: e.state.id,
          name: e.state.name,
          date: e.state.date,
          eventType: e.state.eventType,
        })),
        mode: health?.mode ?? "demo",
      } as T;
    }
    if (resource === "events" && id) {
      const item = record(store, id);
      if (!section) return item.state as T;
      if (
        section === "guests" ||
        section === "expenses" ||
        section === "changes"
      )
        return item[section] as T;
      if (section === "budget")
        return {
          total: item.state.budget,
          contingency: item.state.contingency,
          categories: item.state.categories,
        } as T;
      if (["tasks", "timeline", "vendors", "ideas", "risks"].includes(section))
        return item.state[
          section === "ideas" ? "recommendations" : (section as "tasks")
        ] as T;
    }
    throw new Error("Unknown browser data request.");
  }
  return edit((store) =>
    mutate(
      store,
      resource,
      id,
      section,
      itemId,
      action,
      paymentId,
      method,
      body,
    ),
  ) as Promise<T>;
}

function mutate(
  store: Store,
  resource: string,
  id: string,
  section: string,
  itemId: string,
  action: string,
  paymentId: string,
  method: string,
  body: unknown,
): unknown {
  if (resource === "events" && !id && method === "POST") {
    const state = create_event_plan(eventSchema.parse(body), uid());
    state.actions = [
      {
        tool: "create_event_plan",
        summary:
          "Created a browser-saved plan. Ask the AI planner to personalize it.",
      },
    ];
    store.events.unshift({ state, guests: [], expenses: [], changes: [] });
    return state;
  }
  if (resource === "events" && id) {
    const item = record(store, id);
    const state = item.state;
    if (!section) {
      if (method === "DELETE") {
        store.events = store.events.filter((e) => e.state.id !== id);
        return;
      }
      if (method === "PATCH") {
        const patch = eventPatchSchema.parse(body);
        if (
          patch.currency &&
          patch.currency !== state.currency &&
          item.expenses.length
        )
          throw new Error(
            "Remove expense records before changing currency, or create a separate event.",
          );
        const input = eventSchema.parse({
          ...eventSchema.parse(
            Object.fromEntries(
              Object.keys(eventSchema.shape).map((k) => [
                k,
                state[k as keyof EventState],
              ]),
            ),
          ),
          ...patch,
        });
        return finish(item, create_event_plan(input, id, state));
      }
    }
    if (section === "changes" && method === "POST") {
      const change = found(
        item.changes.find((c) => c.id === itemId),
        "Change preview",
      );
      if (action === "discard") {
        if (change.status !== "Pending")
          throw new Error("This preview is no longer pending.");
        change.status = "Discarded";
        return state;
      }
      if (!["apply", "undo"].includes(action))
        throw new Error("Unknown change action.");
      const undo = action === "undo";
      if (
        undo
          ? change.status !== "Applied" ||
            change.appliedVersion !== state.version
          : change.status !== "Pending" || change.baseVersion !== state.version
      )
        throw new Error(
          "This change is stale or already resolved. Ask the planner for a new preview.",
        );
      const next = {
        ...structuredClone(undo ? change.before : change.after),
        messages: [
          ...state.messages,
          {
            role: "assistant",
            content: undo
              ? "Change undone. Your earlier plan is restored."
              : "Reviewed changes applied and saved in this browser.",
          },
        ].slice(-200),
        actions: [
          {
            tool: undo ? "undo_plan_change" : "apply_plan_change",
            summary: change.request,
          },
          ...state.actions,
        ].slice(0, 100),
      };
      if (next.currency !== state.currency && item.expenses.length)
        throw new Error("Currency cannot change while expenses exist.");
      finish(item, next);
      change.status = undo ? "Undone" : "Applied";
      if (!undo) change.appliedVersion = next.version;
      return next;
    }
    if (section === "guests") {
      if (method === "POST" && !itemId) {
        const guest = { ...guestSchema.parse(body), id: uid() };
        item.guests.push(guest);
        finish(item);
        return guest;
      }
      const guest = found(
        item.guests.find((g) => g.id === itemId),
        "Guest",
      );
      if (method === "PATCH") {
        Object.assign(guest, guestSchema.parse(body));
        finish(item);
        return guest;
      }
      if (method === "DELETE") {
        item.guests = item.guests.filter((g) => g.id !== itemId);
        finish(item);
        return;
      }
    }
    if (section === "expenses") {
      if (method === "POST" && !itemId) {
        const expense = {
          ...expenseSchema.parse(body),
          id: uid(),
          payments: [],
        };
        item.expenses.push(expense);
        finish(item);
        return expense;
      }
      const expense = found(
        item.expenses.find((e) => e.id === itemId),
        "Expense",
      );
      if (action === "payments") {
        if (method === "POST") {
          const data = paymentSchema.parse(body);
          if (data.paidOn > today())
            throw new Error("Recorded payments cannot have a future date.");
          if (expense.status !== "Confirmed")
            throw new Error("Confirm the expense before recording a payment.");
          if (
            expense.payments.reduce((s, p) => s + p.amount, 0) + data.amount >
            expense.amount
          )
            throw new Error("This payment exceeds the outstanding balance.");
          const payment = { ...data, id: uid() };
          expense.payments.push(payment);
          finish(item);
          return payment;
        }
        if (method === "DELETE") {
          found(
            expense.payments.find((p) => p.id === paymentId),
            "Payment",
          );
          expense.payments = expense.payments.filter((p) => p.id !== paymentId);
          finish(item);
          return;
        }
      } else {
        if (method === "PATCH") {
          const data = expenseSchema.parse(body);
          const paid = expense.payments.reduce((s, p) => s + p.amount, 0);
          if (data.amount < paid || (paid > 0 && data.status !== "Confirmed"))
            throw new Error(
              "Correct recorded payments before reducing the amount below paid or reverting to a quote.",
            );
          Object.assign(expense, data);
          finish(item);
          return expense;
        }
        if (method === "DELETE") {
          item.expenses = item.expenses.filter((e) => e.id !== itemId);
          finish(item);
          return;
        }
      }
    }
    if (section === "tasks" && method === "POST") {
      state.tasks.push({
        ...taskSchema.parse(body),
        id: uid(),
        generated: false,
      });
      return finish(item);
    }
    if (section === "vendors" && method === "POST") {
      const data = z
        .object({
          name: z.string().min(2).max(60),
          estimatedCost: z.number().int().min(0).max(1e9),
        })
        .strict()
        .parse(body);
      state.vendors.push({
        ...data,
        id: uid(),
        status: "Needed",
        bookingDeadline: state.date,
        selectionCriteria: ["Confirm scope, availability and written terms"],
        questions: ["What is included?"],
        notes: "",
      });
      return finish(item);
    }
  }
  if (["tasks", "vendors"].includes(resource) && id) {
    const item = found(
      store.events.find((e) =>
        resource === "tasks"
          ? e.state.tasks.some((t) => t.id === id)
          : e.state.vendors.some((v) => v.id === id),
      ),
      "Event",
    );
    const state = item.state;
    if (resource === "tasks") {
      const task = found(
        state.tasks.find((t) => t.id === id),
        "Task",
      );
      if (method === "DELETE") {
        state.suppressedTaskIds.push(id);
        state.tasks = state.tasks.filter((t) => t.id !== id);
        state.tasks.forEach(
          (t) => (t.dependencies = t.dependencies.filter((d) => d !== id)),
        );
      } else if (method === "PATCH") {
        const patch = taskPatchSchema.parse(body);
        if (
          patch.status === "Completed" &&
          (patch.dependencies ?? task.dependencies).some(
            (d) => state.tasks.find((t) => t.id === d)?.status !== "Completed",
          )
        )
          throw new Error("Complete this task's dependencies first.");
        Object.assign(task, patch);
        if (Object.keys(patch).some((k) => !["status", "owner"].includes(k)))
          task.customized = true;
      } else throw new Error("Unsupported task action.");
    } else {
      if (method !== "PATCH")
        throw new Error("Vendor deletion is not supported.");
      Object.assign(
        found(
          state.vendors.find((v) => v.id === id),
          "Vendor",
        ),
        vendorPatchSchema.parse(body),
      );
    }
    return finish(item);
  }
  throw new Error("Unknown browser data request.");
}
