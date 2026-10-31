import { describe, expect, it } from "vitest";
import { create_event_plan } from "../lib/engines";
import { eventExample } from "../lib/event-examples";
import { eventStateSchema } from "../lib/event-state-schema";

const plan = () => create_event_plan(eventExample("Wedding"), "integrity");
describe("Untrusted event-state integrity", () => {
  it.each(["Wedding", "Birthday"] as const)(
    "accepts a balanced %s example with valid task dependencies",
    (type) => {
      const input = eventExample(type, new Date("2026-11-01T00:00:00Z"));
      expect(input.date > "2026-11-01").toBe(true);
      expect(
        eventStateSchema.safeParse(create_event_plan(input, type)).success,
      ).toBe(true);
    },
  );
  it("rejects allocations that do not conserve the budget", () => {
    const state = plan();
    state.categories[0].allocated++;
    expect(eventStateSchema.safeParse(state).success).toBe(false);
  });
  it("rejects duplicate task identifiers that would make edits ambiguous", () => {
    const state = plan();
    state.tasks.push({ ...state.tasks[0] });
    expect(eventStateSchema.safeParse(state).success).toBe(false);
  });
  it("rejects cyclic or missing dependencies and deadlines after the event", () => {
    for (const corruption of ["cycle", "missing", "deadline"]) {
      const state = plan();
      if (corruption === "deadline") state.tasks[0].dueDate = "2099-01-01";
      else
        state.tasks[0].dependencies = [
          corruption === "cycle" ? state.tasks[0].id : "unknown",
        ];
      expect(eventStateSchema.safeParse(state).success).toBe(false);
    }
  });
  it("rejects duplicate category names even with different IDs", () => {
    const state = plan();
    state.categories[1].name = state.categories[0].name;
    expect(eventStateSchema.safeParse(state).success).toBe(false);
  });
});
