import type { EventState } from "./types";
import type { Difference } from "./management";
import { money } from "./engines";
const readable = (value: unknown): string =>
  value === null || value === undefined
    ? "Not set"
    : Array.isArray(value)
      ? value.join(", ") || "None"
      : typeof value === "boolean"
        ? value
          ? "Yes"
          : "No"
        : String(value);
export function planDifferences(
  before: EventState,
  after: EventState,
): Difference[] {
  const differences: Difference[] = [];
  const add = (section: string, label: string, a: unknown, b: unknown) => {
    if (JSON.stringify(a) !== JSON.stringify(b))
      differences.push({
        section,
        label,
        before: readable(a),
        after: readable(b),
      });
  };
  for (const [key, label] of Object.entries({
    name: "Event name",
    eventType: "Event type",
    date: "Event date",
    location: "Location",
    guestCount: "Guest count",
    budget: "Total budget",
    currency: "Currency",
    theme: "Theme",
    priorities: "Priorities",
    preferences: "Preferences",
    sustainable: "Eco-friendly planning",
    venueCapacity: "Venue capacity",
    contingency: "Contingency reserve",
  })) {
    const field = key as keyof EventState;
    add(
      "Event",
      label,
      ["budget", "contingency"].includes(key)
        ? money(Number(before[field]), before.currency)
        : before[field],
      ["budget", "contingency"].includes(key)
        ? money(Number(after[field]), after.currency)
        : after[field],
    );
  }
  for (const category of after.categories) {
    const old = before.categories.find((c) => c.name === category.name);
    add(
      "Budget",
      `${category.name} allocation`,
      money(old?.allocated ?? 0, before.currency),
      money(category.allocated, after.currency),
    );
    add(
      "Budget",
      `${category.name} estimate`,
      money(old?.estimated ?? 0, before.currency),
      money(category.estimated, after.currency),
    );
  }
  for (const category of new Set([
    ...Object.keys(before.budgetOverrides),
    ...Object.keys(after.budgetOverrides),
  ])) {
    add(
      "Budget",
      `${category} fixed allocation`,
      before.budgetOverrides[category] === undefined
        ? "Automatic"
        : money(before.budgetOverrides[category], before.currency),
      after.budgetOverrides[category] === undefined
        ? "Automatic"
        : money(after.budgetOverrides[category], after.currency),
    );
  }
  const groups = [
    [
      "Tasks",
      before.tasks,
      after.tasks,
      [
        "title",
        "description",
        "category",
        "priority",
        "status",
        "dueDate",
        "owner",
        "dependencies",
        "estimatedCost",
      ],
    ],
    [
      "Services",
      before.vendors,
      after.vendors,
      [
        "name",
        "status",
        "estimatedCost",
        "bookingDeadline",
        "selectionCriteria",
        "questions",
        "notes",
      ],
    ],
    [
      "Ideas",
      before.recommendations,
      after.recommendations,
      ["idea", "reason", "impact", "estimatedCost", "priority"],
    ],
    [
      "Risks",
      before.risks,
      after.risks,
      ["title", "severity", "probability", "impact", "reason", "action"],
    ],
  ] as const;
  for (const [section, oldRows, newRows, fields] of groups) {
    const oldMap = new Map(oldRows.map((r) => [r.id, r]));
    const newMap = new Map(newRows.map((r) => [r.id, r]));
    for (const id of new Set([...oldMap.keys(), ...newMap.keys()])) {
      const old = oldMap.get(id) as unknown as
        Record<string, unknown> | undefined;
      const next = newMap.get(id) as unknown as
        Record<string, unknown> | undefined;
      const label = String(
        next?.title ??
          next?.name ??
          next?.idea ??
          old?.title ??
          old?.name ??
          old?.idea ??
          id,
      );
      const fieldLabel = (field: string) =>
        field.replace(/([A-Z])/g, " $1").toLowerCase();
      const display = (
        row: Record<string, unknown>,
        field: string,
        currency: string,
      ) => {
        if (field === "estimatedCost")
          return money(Number(row[field]), currency);
        if (field === "dependencies" && Array.isArray(row[field]))
          return (row[field] as string[]).map(
            (id) =>
              after.tasks.find((t) => t.id === id)?.title ??
              before.tasks.find((t) => t.id === id)?.title ??
              id,
          );
        return row[field];
      };
      const detail = (row: Record<string, unknown>, currency: string) =>
        fields
          .map(
            (field) =>
              `${fieldLabel(field)}: ${readable(display(row, field, currency))}`,
          )
          .join("\n");
      if (!old || !next) {
        add(
          section,
          label,
          old ? detail(old, before.currency) : "Not included",
          next ? detail(next, after.currency) : "Removed",
        );
        continue;
      }
      for (const field of fields)
        add(
          section,
          `${label} · ${fieldLabel(field)}`,
          display(old, field, before.currency),
          display(next, field, after.currency),
        );
    }
  }
  return differences;
}
