import { describe, it, expect } from "vitest";
import {
  calculate_budget,
  create_event_plan,
  generate_tasks,
  identify_risks,
} from "../lib/engines";
import { extractDemo } from "../lib/agent/extract";
import { demoAgent } from "../lib/agent/orchestrator";
import {
  eventSchema,
  eventPatchSchema,
  taskPatchSchema,
} from "../lib/validation";
const input = extractDemo(
  "Wedding in Delhi, February 2027, 250 guests, ₹12 lakh budget.",
).event;
describe("Event extraction and validation", () => {
  it("never injects creation defaults into partial updates", () => {
    expect(taskPatchSchema.parse({ status: "Completed" })).toEqual({
      status: "Completed",
    });
    expect(eventPatchSchema.parse({ budget: 1000000 })).toEqual({
      budget: 1000000,
    });
  });
  it("extracts the exact demo request with explicit date assumptions", () => {
    const r = extractDemo(
      "Wedding in Delhi, February 2027, 250 guests, ₹12 lakh budget.",
    );
    expect(r.event).toMatchObject({
      eventType: "Wedding",
      location: "Delhi",
      guestCount: 250,
      budget: 1200000,
      date: "2027-02-14",
    });
    expect(r.assumptions.some((a) => a.includes("placeholder"))).toBe(true);
  });
  it("rejects impossible dates and invalid amounts", () => {
    expect(() => eventSchema.parse({ ...input, date: "2027-02-30" })).toThrow();
    expect(() => eventSchema.parse({ ...input, budget: -1 })).toThrow();
    expect(() => eventSchema.parse({ ...input, guestCount: 0 })).toThrow();
  });
});
describe("Deterministic engines", () => {
  it.each([101, 1000, 1000000, 1200001, 1000000000])(
    "allocates exactly the budget including reserve: %i",
    (budget) => {
      const result = calculate_budget({ ...input, budget }, "test");
      expect(
        result.categories.reduce((a, c) => a + c.allocated, 0) +
          result.contingency,
      ).toBe(budget);
      expect(
        result.categories.every(
          (c) => c.allocated >= 0 && Number.isInteger(c.allocated),
        ),
      ).toBe(true);
    },
  );
  it("uses suggested weights but validates arithmetic", () => {
    const r = calculate_budget(input, "test", { Photography: 9000000 });
    expect(
      r.categories.find((c) => c.name === "Photography")!.allocated,
    ).toBeGreaterThan(500000);
    expect(
      r.categories.reduce((a, c) => a + c.allocated, 0) + r.contingency,
    ).toBe(input.budget);
  });
  it("honors photography allocations and rejects an impossible allocation", () => {
    expect(
      calculate_budget(input, "test", undefined, {
        Photography: 150000,
      }).categories.find((c) => c.name === "Photography")!.allocated,
    ).toBe(150000);
    expect(() =>
      calculate_budget(input, "test", undefined, { Photography: 2000000 }),
    ).toThrow();
  });
  it("generates tasks before event and after today when possible", () => {
    const tasks = generate_tasks(input, "test", [], "2026-10-31");
    expect(
      tasks.every((t) => t.dueDate >= "2026-10-31" && t.dueDate <= input.date),
    ).toBe(true);
    for (const task of tasks)
      for (const dep of task.dependencies)
        expect(tasks.find((t) => t.id === dep)!.dueDate <= task.dueDate).toBe(
          true,
        );
  });
  it("detects overrun, missing bookings, capacity and impossible dates", () => {
    const s = create_event_plan(
      { ...input, date: "2020-01-01", budget: 1000, venueCapacity: 200 },
      "test",
    );
    const titles = identify_risks(s).map((r) => r.title);
    expect(titles).toContain("Estimated spending exceeds target");
    expect(titles).toContain("Event date is in the past");
    expect(titles).toContain("Venue capacity is insufficient");
    expect(titles).toContain("Key services still need booking");
  });
});
describe("Stateful demo agent", () => {
  it("runs budget → guests → sustainability without losing completed tasks or bookings", () => {
    let s = create_event_plan(input, "demo");
    s.tasks[0].status = "Completed";
    s.vendors[0].status = "Booked";
    s.vendors[0].notes = "User-provided booking";
    s = demoAgent(s, "Reduce my budget to ₹10 lakh.").state;
    expect(s.budget).toBe(1000000);
    const catering = s.categories.find((c) => c.name === "Catering")!.estimated;
    s = demoAgent(s, "Increase guests to 350.").state;
    expect(s.guestCount).toBe(350);
    expect(
      s.categories.find((c) => c.name === "Catering")!.estimated,
    ).toBeGreaterThan(catering);
    expect(s.tasks[0].title).toContain("350");
    s = demoAgent(s, "Make it eco-friendly.").state;
    expect(s.sustainable).toBe(true);
    expect(s.tasks.some((t) => t.category === "Sustainability")).toBe(true);
    expect(s.vendors[0].selectionCriteria.join(" ")).toContain("sustainable");
    expect(s.tasks[0].status).toBe("Completed");
    expect(s.vendors[0].status).toBe("Booked");
    expect(s.vendors[0].notes).toBe("User-provided booking");
  });
  it("moves dates and derives a new timeline", () => {
    const s = demoAgent(
      create_event_plan(input, "demo"),
      "Move the event to March.",
    ).state;
    expect(s.date).toBe("2027-03-14");
    expect(s.timeline.every((t) => t.dueDate <= s.date)).toBe(true);
  });
  it("keeps question-only interactions read-only", () => {
    const s = create_event_plan(input, "demo");
    const r = demoAgent(s, "What vendors do I still need?");
    expect(r.state).toEqual(s);
    expect(r.actions).toHaveLength(0);
    expect(r.reply).toContain("Venue");
  });
  it("preserves explicit category allocations across guest changes", () => {
    let s = demoAgent(
      create_event_plan(input, "demo"),
      "Increase photography budget to ₹1.5 lakh.",
    ).state;
    s = demoAgent(s, "Increase guests to 350.").state;
    expect(s.categories.find((c) => c.name === "Photography")?.allocated).toBe(
      150000,
    );
  });
  it("does not resurrect deleted generated tasks and preserves edited titles", () => {
    let s = create_event_plan(input, "demo");
    s.suppressedTaskIds = [s.tasks[0].id];
    s.tasks[1].customized = true;
    s.tasks[1].title = "My custom caterer briefing";
    s = demoAgent(s, "Make it eco-friendly.").state;
    expect(s.tasks.some((t) => t.id === s.suppressedTaskIds[0])).toBe(false);
    expect(s.tasks.some((t) => t.title === "My custom caterer briefing")).toBe(
      true,
    );
  });
});
