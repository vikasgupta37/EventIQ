import { z } from "zod";
import { eventStateSchema } from "./event-state-schema";
import { today } from "./engines";
import {
  guestSchema,
  expenseSchema,
  paymentSchema,
  type Guest,
  type Expense,
  type PlanChange,
} from "./management";
import type { EventState, Action } from "./types";
const idSchema = z.string().min(1).max(160);
export type StoredChange = PlanChange & {
  before: EventState;
  after: EventState;
  actions: Action[];
};
export type RecordData = {
  state: EventState;
  guests: Guest[];
  expenses: Expense[];
  changes: StoredChange[];
};
export type Store = { format: 1; events: RecordData[] };
export const storedSchema = z
  .object({
    format: z.literal(1),
    events: z
      .array(
        z.object({
          state: eventStateSchema,
          guests: z.array(guestSchema.extend({ id: idSchema })).max(2000),
          expenses: z
            .array(
              expenseSchema.extend({
                id: idSchema,
                payments: z
                  .array(paymentSchema.extend({ id: idSchema }))
                  .max(1000),
              }),
            )
            .max(1000),
          changes: z
            .array(
              z.object({
                id: idSchema,
                status: z.enum(["Pending", "Applied", "Discarded", "Undone"]),
                baseVersion: z.number().int().min(1),
                appliedVersion: z.number().int().min(1).nullable(),
                request: z.string().max(6000),
                explanation: z.string().max(6000),
                differences: z.array(
                  z.object({
                    section: z.string(),
                    label: z.string(),
                    before: z.string(),
                    after: z.string(),
                  }),
                ),
                createdAt: z.string().max(40),
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
  })
  .superRefine((store, context) => {
    const issue = (message: string) =>
      context.addIssue({ code: "custom", message });
    const unique = (items: { id: string }[], label: string) => {
      if (new Set(items.map((item) => item.id)).size !== items.length)
        issue(`${label} IDs must be unique.`);
    };
    unique(
      store.events.map((record) => record.state),
      "Event",
    );
    // Task/vendor endpoints use globally addressed IDs, including after import.
    unique(
      store.events.flatMap((record) => record.state.tasks),
      "Task",
    );
    unique(
      store.events.flatMap((record) => record.state.vendors),
      "Vendor",
    );
    for (const record of store.events) {
      unique(record.guests, "Guest");
      unique(record.expenses, "Expense");
      unique(record.changes, "Change");
      for (const expense of record.expenses) {
        unique(expense.payments, "Payment");
        const paid = expense.payments.reduce(
          (sum, payment) => sum + payment.amount,
          0,
        );
        if (paid > expense.amount) issue("Payments exceed the expense amount.");
        if (paid && expense.status !== "Confirmed")
          issue("Only confirmed expenses can have payments.");
        if (expense.payments.some((payment) => payment.paidOn > today()))
          issue("Recorded payments cannot be in the future.");
      }
      for (const change of record.changes) {
        if (
          change.before.id !== record.state.id ||
          change.after.id !== record.state.id
        )
          issue("Change snapshots must belong to their event.");
        if (
          change.before.version !== change.baseVersion ||
          change.after.version !== change.baseVersion ||
          change.baseVersion > record.state.version
        )
          issue("Invalid change preview version.");
        const resolved =
          change.status === "Applied" || change.status === "Undone";
        if (
          resolved
            ? change.appliedVersion !== change.baseVersion + 1 ||
              change.appliedVersion > record.state.version
            : change.appliedVersion !== null
        )
          issue("Invalid applied change version.");
      }
    }
  });
