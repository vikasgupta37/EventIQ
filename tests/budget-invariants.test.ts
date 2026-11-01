import { describe, expect, it } from "vitest";
import { calculate_budget, categoryNames } from "../lib/engines";
import { eventExample } from "../lib/event-examples";
import type { EventInput } from "../lib/validation";

describe("Budget invariants across supported event scopes", () => {
  it("conserves every currency unit across 360 budget, currency and event-type combinations", () => {
    const types: EventInput["eventType"][] = [
      "Wedding",
      "Birthday",
      "Community",
      "Corporate",
      "Private",
      "Custom",
    ];
    const currencies: EventInput["currency"][] = ["INR", "USD", "EUR", "GBP"];
    for (const eventType of types)
      for (const currency of currencies)
        for (const budget of [100, 101, 9999, 1200000, 1000000000])
          for (const guestCount of [1, 250, 100000]) {
            const event = {
              ...eventExample("Wedding"),
              eventType,
              currency,
              budget,
              guestCount,
            };
            const plan = calculate_budget(
              event,
              "matrix",
              { Photography: 9999999 },
              { Invitations: 0 },
            );
            expect(
              plan.categories.reduce(
                (sum, c) => sum + c.allocated,
                plan.contingency,
              ),
            ).toBe(budget);
            expect(
              plan.categories.every(
                (c) => Number.isSafeInteger(c.allocated) && c.allocated >= 0,
              ),
            ).toBe(true);
            expect(
              plan.categories.every(
                (c) => Number.isSafeInteger(c.estimated) && c.estimated >= 0,
              ),
            ).toBe(true);
            expect(
              plan.categories.find((c) => c.name === "Invitations")?.allocated,
            ).toBe(0);
          }
  });
  it.each([NaN, Infinity, -1, 0, 1e308])(
    "rejects unusable AI weights (%s)",
    (weight) => {
      expect(() =>
        calculate_budget(eventExample("Wedding"), "invalid", { Venue: weight }),
      ).toThrow("weights");
    },
  );
  it("rejects unknown and incomplete fixed allocation sets", () => {
    const input = eventExample("Wedding");
    expect(() =>
      calculate_budget(input, "invalid", undefined, { Unknown: 10 }),
    ).toThrow("known categories");
    const fixed = Object.fromEntries(categoryNames.map((name) => [name, 0]));
    expect(() => calculate_budget(input, "invalid", undefined, fixed)).toThrow(
      "Fully fixed",
    );
    fixed.Venue = input.budget - Math.round(input.budget * 0.1);
    expect(
      calculate_budget(input, "valid", undefined, fixed).categories[0]
        .allocated,
    ).toBe(fixed.Venue);
  });
});
