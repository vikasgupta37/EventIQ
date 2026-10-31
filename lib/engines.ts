import type {
  Category,
  EventState,
  Idea,
  Risk,
  Task,
  Timeline,
  Vendor,
} from "./types";
import type { EventInput } from "./validation";
export const today = () => new Date().toISOString().slice(0, 10);
export const daysUntil = (date: string, now = today()) =>
  Math.ceil((Date.parse(date) - Date.parse(now)) / 86400000);
export const money = (n: number, currency = "INR") =>
  new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
const key = (eventId: string, name: string) =>
  `${eventId}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
export const categoryNames = [
  "Venue",
  "Catering",
  "Decoration",
  "Photography",
  "Entertainment",
  "Clothing",
  "Transport",
  "Invitations",
  "Staff",
  "Miscellaneous",
];
export function calculate_budget(
  e: EventInput,
  id: string,
  weights?: Record<string, number>,
  overrides?: Record<string, number>,
): { categories: Category[]; contingency: number } {
  const unit = e.currency === "INR" ? 1 : e.currency === "USD" ? 0.014 : 0.012;
  const wedding = e.eventType === "Wedding";
  const costs = [
    120000 + e.guestCount * 220,
    e.guestCount * (wedding ? 1100 : 650),
    wedding ? 95000 : 35000,
    wedding ? 120000 : 35000,
    wedding ? 45000 : 25000,
    wedding ? 70000 : 5000,
    e.guestCount * 180,
    e.guestCount * (e.sustainable ? 10 : 70),
    e.guestCount * 90,
    18000,
  ];
  const estimates = costs.map((v, i) =>
    Math.round(v * unit * (e.sustainable && i === 2 ? 0.75 : 1)),
  );
  const contingency = Math.round(e.budget * 0.1);
  const available = e.budget - contingency;
  const fixedTotal = Object.values(overrides ?? {}).reduce((a, b) => a + b, 0);
  if (fixedTotal > available)
    throw new Error(
      "Category allocations exceed the budget after the 10% contingency reserve.",
    );
  const scores = categoryNames.map((name, i) =>
    overrides?.[name] !== undefined
      ? 0
      : Math.max(0.01, weights?.[name] ?? estimates[i]) *
        (e.priorities.some(
          (p) =>
            p.toLowerCase().includes(name.toLowerCase()) ||
            (name === "Catering" && /food/i.test(p)),
        )
          ? 1.3
          : 1),
  );
  const total = scores.reduce((a, b) => a + b, 0);
  let remaining = available - fixedTotal;
  const last = scores.findLastIndex((v) => v > 0);
  const categories = categoryNames.map((name, i) => {
    const allocated =
      overrides?.[name] ??
      (i === last
        ? remaining
        : Math.floor(((available - fixedTotal) * scores[i]) / total));
    if (overrides?.[name] === undefined) remaining -= allocated;
    return {
      id: key(id, name),
      name,
      allocated,
      estimated: estimates[i],
      priority: e.priorities.some((p) =>
        p.toLowerCase().includes(name.toLowerCase()),
      )
        ? "High"
        : "Medium",
      reasoning: `${weights ? "AI-suggested weighting" : "Rule-based demo allocation"}; adjusted for ${e.eventType.toLowerCase()}, ${e.guestCount} guests and priorities. Estimate is a planning assumption, not a supplier quote.`,
    };
  });
  return { categories, contingency };
}
export const rebalance_budget = calculate_budget;
export function generate_tasks(
  e: EventInput,
  id: string,
  old: Task[] = [],
  now = today(),
): Task[] {
  const specs: [string, string, number, string[]][] = [
    [`Confirm venue capacity for ${e.guestCount} guests`, "Venue", 150, []],
    [
      `Shortlist ${e.eventType.toLowerCase()} catering for ${e.guestCount} guests`,
      "Catering",
      120,
      ["Venue"],
    ],
    ["Book photography and agree deliverables", "Photography", 100, []],
    [
      `Create the ${e.theme || "event"} design brief`,
      "Decoration",
      75,
      ["Venue"],
    ],
    [
      `Send ${e.sustainable ? "digital" : "personalized"} invitations`,
      "Invitations",
      60,
      ["Venue"],
    ],
    ["Confirm entertainment and equipment", "Entertainment", 45, ["Venue"]],
    [
      `Arrange transport for ${e.guestCount} guests`,
      "Transport",
      30,
      ["Venue"],
    ],
    [
      "Confirm dietary needs and final headcount",
      "Guest experience",
      14,
      ["Catering", "Invitations"],
    ],
    [
      "Finalize run of show with all suppliers",
      "Coordination",
      7,
      ["Venue", "Catering", "Photography"],
    ],
    ["Check setup, safety and guest welcome", "Event day", 0, ["Coordination"]],
  ];
  if (e.sustainable)
    specs.push(
      [
        "Arrange reusable decor and waste sorting",
        "Sustainability",
        21,
        ["Decoration"],
      ],
      [
        "Confirm seasonal menu and food donation logistics",
        "Sustainable catering",
        14,
        ["Catering"],
      ],
      ["Coordinate shared guest transport", "Shared travel", 14, ["Transport"]],
    );
  return [
    ...specs.map(([title, category, days, deps], i): Task => {
      const taskId = key(id, `task-${category}`);
      const existing = old.find((t) => t.id === taskId);
      const ideal = new Date(Date.parse(e.date) - days * 86400000)
        .toISOString()
        .slice(0, 10);
      const dueDate = ideal < now ? (now > e.date ? e.date : now) : ideal;
      if (existing?.customized)
        return {
          ...existing,
          dueDate: existing.dueDate > e.date ? e.date : existing.dueDate,
        };
      return {
        id: taskId,
        title,
        category,
        description: `Plan for ${e.guestCount} guests in ${e.location}. ${e.sustainable ? "Prefer reusable materials and low-waste options." : ""}`,
        priority: i < 3 ? "High" : "Medium",
        status: existing?.status ?? "Not Started",
        dueDate,
        estimatedCost: existing?.estimatedCost ?? 0,
        owner: existing?.owner ?? "You",
        dependencies: deps.map((d) => key(id, `task-${d}`)),
        generated: true,
      };
    }),
    ...old
      .filter((t) => !t.generated)
      .map((t) => ({ ...t, dueDate: t.dueDate > e.date ? e.date : t.dueDate })),
  ];
}
export function generate_timeline(tasks: Task[]): Timeline[] {
  return tasks
    .map((t) => ({
      id: `${t.id}-milestone`,
      title: t.title,
      category: t.category,
      dueDate: t.dueDate,
      priority: t.priority,
      status: t.status,
      dependencies: t.dependencies,
    }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
export function recommend_services(
  e: EventInput,
  id: string,
  categories: Category[],
  old: Vendor[] = [],
): Vendor[] {
  const services = categories
    .filter((c) => !["Clothing", "Miscellaneous"].includes(c.name))
    .map((c) => {
      const existing = old.find((v) => v.name === c.name);
      return {
        id: key(id, `vendor-${c.name}`),
        name: c.name,
        status: existing?.status ?? "Needed",
        estimatedCost:
          existing?.status === "Booked" ? existing.estimatedCost : c.estimated,
        bookingDeadline: new Date(
          Math.max(
            Math.min(Date.parse(today()), Date.parse(e.date)),
            Date.parse(e.date) - 90 * 86400000,
          ),
        )
          .toISOString()
          .slice(0, 10),
        selectionCriteria: [
          `Experience with ${e.eventType.toLowerCase()} events in ${e.location}`,
          `Capacity for ${e.guestCount} guests`,
          e.sustainable
            ? "Reusable materials, waste separation and sustainable sourcing"
            : "Transparent written pricing and cancellation terms",
        ],
        questions: [
          "What is included in the quote?",
          "What are your cancellation and backup arrangements?",
          e.sustainable
            ? "How do you reduce waste and emissions?"
            : "Can you share verifiable references?",
        ],
        notes: existing?.notes ?? "",
      };
    });
  return [
    ...services,
    ...old.filter((v) => !services.some((s) => s.name === v.name)),
  ];
}
export function generate_event_ideas(e: EventInput, id: string): Idea[] {
  const specs = [
    [
      "Themes",
      `${e.theme || "Modern"} ${e.eventType.toLowerCase()} with a local touch`,
      `Use details inspired by ${e.location} to make the event feel personal.`,
      0,
    ],
    [
      "Decorations",
      e.sustainable
        ? "Rent reusable decor and potted plants"
        : "Create one statement focal point",
      "Focus spending on a high-visibility space instead of decorating every corner.",
      Math.round(e.budget * 0.025),
    ],
    [
      "Food",
      e.sustainable
        ? "Seasonal menu with reusable dinnerware"
        : "A regional tasting station",
      `Serve ${e.guestCount} guests with a concise menu and clear dietary labels.`,
      Math.round(e.budget * 0.015),
    ],
    [
      "Entertainment",
      e.eventType === "Corporate"
        ? "Interactive team storytelling"
        : "A shared celebration playlist",
      "Invite contributions in advance to personalize the atmosphere.",
      0,
    ],
    [
      "Guest Experience",
      e.guestCount > 300
        ? "Staggered arrivals and welcome hosts"
        : "A thoughtful welcome guide",
      `Help ${e.guestCount} guests navigate ${e.location} with clear timings and transport details.`,
      Math.round(e.budget * 0.005),
    ],
    [
      "Photography",
      "A golden-hour portrait schedule",
      `${e.priorities.join(", ") || "Guest memories"} guide the shot list; confirm timing with your photographer.`,
      0,
    ],
    [
      "Sustainability",
      e.sustainable
        ? "Digital invites, shared rides and waste stations"
        : "Offer a digital RSVP option",
      "Reduce paper waste and make guest responses easier to track.",
      0,
    ],
    [
      "Budget Saving",
      "Compare three itemized quotes",
      `With ${money(e.budget, e.currency)} available, protect priorities and negotiate bundled services.`,
      0,
    ],
  ] as const;
  return specs.map(([category, idea, reason, cost]) => ({
    id: key(id, `idea-${category}`),
    category,
    idea,
    reason,
    impact: "Planning suggestion; validate with suppliers before committing.",
    estimatedCost: cost,
    priority: e.priorities.some((p) =>
      category.toLowerCase().includes(p.toLowerCase()),
    )
      ? "High"
      : "Medium",
  }));
}
export function identify_risks(e: EventState, now = today()): Risk[] {
  const risks: Risk[] = [];
  const add = (
    title: string,
    severity: string,
    reason: string,
    action: string,
  ) =>
    risks.push({
      id: key(e.id, `risk-${title}`),
      title,
      severity,
      probability: severity === "High" ? "Likely" : "Possible",
      impact:
        severity === "High"
          ? "Could affect cost or event delivery"
          : "Needs attention during planning",
      reason,
      action,
    });
  const spend = e.categories.reduce((a, c) => a + c.estimated, 0);
  if (spend + e.contingency > e.budget)
    add(
      "Estimated spending exceeds target",
      "High",
      `Estimates plus reserve exceed the budget by ${money(spend + e.contingency - e.budget, e.currency)}.`,
      "Compare quotes, reduce optional scope or revise the target.",
    );
  if (daysUntil(e.date, now) < 0)
    add(
      "Event date is in the past",
      "High",
      "Preparation cannot be scheduled before today.",
      "Choose a future date or use this event as an archive.",
    );
  else if (daysUntil(e.date, now) < 30)
    add(
      "Short preparation window",
      "High",
      "Fewer than 30 days remain.",
      "Prioritize venue, catering and critical dependencies this week.",
    );
  const missing = e.vendors.filter(
    (v) =>
      ["Venue", "Catering", "Photography"].includes(v.name) &&
      v.status !== "Booked",
  );
  if (missing.length)
    add(
      "Key services still need booking",
      daysUntil(e.date, now) < 60 ? "High" : "Medium",
      `${missing.map((v) => v.name).join(", ")} have no recorded booking.`,
      "Request availability and written terms; update status only after confirmation.",
    );
  if (e.venueCapacity !== null && e.guestCount > e.venueCapacity)
    add(
      "Venue capacity is insufficient",
      "High",
      `${e.guestCount} guests exceed the recorded capacity of ${e.venueCapacity}.`,
      "Select a larger venue or reduce the guest list.",
    );
  else if (e.venueCapacity === null)
    add(
      "Venue capacity needs verification",
      "Medium",
      `Capacity has not been confirmed for ${e.guestCount} guests.`,
      "Record the venue capacity after checking layout and safety requirements.",
    );
  if (e.contingency < e.budget * 0.08)
    add(
      "Low contingency reserve",
      "Medium",
      "Less than 8% is reserved.",
      "Reserve 8–12% for unexpected expenses.",
    );
  if (
    e.tasks.filter(
      (t) => t.status !== "Completed" && daysUntil(t.dueDate, now) <= 7,
    ).length > 5
  )
    add(
      "Several tasks are due soon",
      "Medium",
      "More than five unfinished tasks are due within a week.",
      "Assign owners and complete dependencies first.",
    );
  return risks;
}
export function create_event_plan(
  e: EventInput,
  id: string,
  previous?: EventState,
  weights?: Record<string, number>,
  overrides?: Record<string, number>,
): EventState {
  const budgetOverrides = { ...previous?.budgetOverrides, ...overrides };
  const budget = calculate_budget(e, id, weights, budgetOverrides);
  const suppressedTaskIds = previous?.suppressedTaskIds ?? [];
  const tasks = generate_tasks(e, id, previous?.tasks).filter(
    (t) => !suppressedTaskIds.includes(t.id),
  );
  for (const task of tasks)
    task.dependencies = task.dependencies.filter((d) =>
      tasks.some((t) => t.id === d),
    );
  for (let i = 0; i < tasks.length; i++)
    for (const task of tasks)
      for (const dep of task.dependencies) {
        const dependency = tasks.find((t) => t.id === dep);
        if (dependency && dependency.dueDate > task.dueDate)
          task.dueDate = dependency.dueDate;
      }
  const state: EventState = {
    ...e,
    id,
    version: previous?.version ?? 1,
    updatedAt: new Date().toISOString(),
    suppressedTaskIds,
    budgetOverrides,
    ...budget,
    tasks,
    timeline: generate_timeline(tasks),
    vendors: recommend_services(e, id, budget.categories, previous?.vendors),
    recommendations: generate_event_ideas(e, id),
    risks: [],
    messages: previous?.messages ?? [],
    actions: previous?.actions ?? [],
    progress: Math.round(
      (tasks.filter((t) => t.status === "Completed").length /
        Math.max(1, tasks.length)) *
        100,
    ),
  };
  state.risks = identify_risks(state);
  return state;
}
export const update_event_plan = create_event_plan;
