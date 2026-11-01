// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { create_event_plan } from "../lib/engines";
import { eventExample } from "../lib/event-examples";
import { storedSchema, type Store } from "../lib/browser-backup";
import {
  browserApi,
  exportBrowserData,
  importBrowserData,
} from "../lib/browser-store";
import { planDifferences } from "../lib/changes";

function backup(): Store {
  const state = create_event_plan(eventExample("Wedding"), "imported-event");
  return {
    format: 1,
    events: [
      {
        state,
        guests: [
          {
            id: "guest",
            name: "Sample Guest",
            email: "",
            phone: "",
            rsvp: "Accepted",
            plusOnes: 0,
            dietary: "",
            tableName: "",
            notes: "",
          },
        ],
        expenses: [
          {
            id: "expense",
            title: "Venue agreement",
            category: "Venue",
            supplier: "",
            amount: 1000,
            status: "Confirmed",
            dueDate: null,
            notes: "",
            payments: [
              {
                id: "payment",
                amount: 100,
                paidOn: "2026-01-01",
                reference: "",
              },
            ],
          },
        ],
        changes: [],
      },
    ],
  };
}
beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());
describe("Backup integrity at the import boundary", () => {
  const cases: [string, (store: Store) => void][] = [
    ["duplicate guests", (s) => s.events[0].guests.push(s.events[0].guests[0])],
    [
      "duplicate expenses",
      (s) => s.events[0].expenses.push(s.events[0].expenses[0]),
    ],
    [
      "duplicate payments",
      (s) =>
        s.events[0].expenses[0].payments.push(
          s.events[0].expenses[0].payments[0],
        ),
    ],
    [
      "overpaid expenses",
      (s) => {
        s.events[0].expenses[0].payments[0].amount = 1001;
      },
    ],
    [
      "payments against a quote",
      (s) => {
        s.events[0].expenses[0].status = "Quoted";
      },
    ],
    [
      "future recorded payments",
      (s) => {
        s.events[0].expenses[0].payments[0].paidOn = "9999-01-01";
      },
    ],
    [
      "task IDs reused by another event",
      (s) => {
        const other = structuredClone(s.events[0]);
        other.state.id = "other-event";
        s.events.push(other);
      },
    ],
    [
      "preview for another event",
      (s) => {
        const state = s.events[0].state;
        const after = create_event_plan(
          { ...eventExample("Wedding"), budget: 1000000 },
          "wrong-event",
          state,
        );
        s.events[0].changes.push({
          id: "preview",
          status: "Pending",
          baseVersion: 1,
          appliedVersion: null,
          request: "Reduce budget",
          explanation: "Draft",
          differences: planDifferences(state, after),
          createdAt: new Date().toISOString(),
          before: structuredClone(state),
          after,
          actions: [],
        });
      },
    ],
  ];
  it.each(cases)(
    "rejects %s without changing existing plans",
    async (_label, corrupt) => {
      await browserApi("events", "POST", eventExample("Birthday"));
      const saved = exportBrowserData();
      const data = backup();
      expect(storedSchema.safeParse(data).success).toBe(true);
      corrupt(data);
      expect(storedSchema.safeParse(data).success).toBe(false);
      await expect(importBrowserData(JSON.stringify(data))).rejects.toThrow(
        "not a valid",
      );
      expect(exportBrowserData()).toBe(saved);
    },
  );
  it("round trips valid guest and payment records", async () => {
    const data = backup();
    await importBrowserData(JSON.stringify(data));
    expect(JSON.parse(exportBrowserData())).toEqual(data);
  });
});
