import { randomUUID } from "node:crypto";
import { db } from "./client";
import { AppError } from "../auth";
import {
  create_event_plan,
  generate_timeline,
  identify_risks,
} from "../engines";
import { eventSchema, type EventInput } from "../validation";
import type { Action, EventState, Message } from "../types";
import { validateTaskGraph } from "../tasks";
const include = {
  preferences: true,
  budgetPlan: { include: { categories: true } },
  tasks: true,
  timeline: true,
  vendors: true,
  recommendations: true,
  risks: true,
  conversation: {
    include: {
      messages: { orderBy: { createdAt: "desc" as const }, take: 200 },
    },
  },
  actions: { orderBy: { createdAt: "desc" as const }, take: 50 },
};
export async function get_event_state(
  id: string,
  userId: string,
): Promise<EventState> {
  const e = await db.event.findFirst({ where: { id, userId }, include });
  if (!e) throw new AppError(404, "Event not found.");
  const base = eventSchema.parse({
    ...Object.fromEntries(
      Object.keys(eventSchema.shape).map((k) => [k, e[k as keyof typeof e]]),
    ),
    preferences: e.preferences.map((p) => p.value),
  });
  return {
    ...base,
    id: e.id,
    version: e.version,
    updatedAt: e.updatedAt.toISOString(),
    suppressedTaskIds: e.suppressedTaskIds,
    budgetOverrides: e.budgetOverrides as Record<string, number>,
    categories: e.budgetPlan?.categories ?? [],
    contingency: e.budgetPlan?.contingency ?? 0,
    tasks: e.tasks as EventState["tasks"],
    timeline: e.timeline,
    vendors: e.vendors,
    recommendations: e.recommendations,
    risks: e.risks,
    messages:
      e.conversation?.messages.reverse().map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      })) ?? [],
    actions: e.actions.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
    progress: Math.round(
      (e.tasks.filter((t) => t.status === "Completed").length /
        Math.max(1, e.tasks.length)) *
        100,
    ),
  };
}
export async function listEvents(userId: string) {
  return db.event.findMany({
    where: { userId },
    select: { id: true, name: true, date: true, eventType: true },
    orderBy: { createdAt: "desc" },
  });
}
export async function saveState(
  state: EventState,
  userId: string,
  actions: Action[] = [],
  messages: Message[] = [],
  create = false,
  change?: { id: string; action: "apply" | "undo" },
): Promise<EventState> {
  const { preferences, ...base } = eventSchema.parse(
    Object.fromEntries(
      Object.keys(eventSchema.shape).map((k) => [
        k,
        state[k as keyof EventState],
      ]),
    ),
  );
  try {
    validateTaskGraph(state.tasks, state.date);
  } catch (error) {
    throw new AppError(400, (error as Error).message);
  }
  state.timeline = generate_timeline(state.tasks);
  for (const category of state.categories) {
    const vendor = state.vendors.find((v) => v.name === category.name);
    if (vendor) category.estimated = vendor.estimatedCost;
  }
  state.risks = identify_risks(state);
  await db.$transaction(
    async (tx) => {
      const metadata = {
        suppressedTaskIds: state.suppressedTaskIds,
        budgetOverrides: state.budgetOverrides,
      };
      if (create)
        await tx.event.create({
          data: { id: state.id, userId, ...base, ...metadata },
        });
      else {
        const existing = await tx.event.findFirst({
          where: { id: state.id, userId },
        });
        if (
          existing &&
          existing.currency !== base.currency &&
          (await tx.expense.count({ where: { eventId: state.id } }))
        )
          throw new AppError(
            409,
            "Currency cannot change while expense records exist. Remove those records first or create a separate event.",
          );
        const result = await tx.event.updateMany({
          where: { id: state.id, userId, version: state.version },
          data: { ...base, ...metadata, version: { increment: 1 } },
        });
        if (!result.count)
          throw new AppError(
            409,
            "This event changed in another request. Refresh and try again.",
          );
      }
      await tx.eventPreference.deleteMany({ where: { eventId: state.id } });
      if (change) {
        const result = await tx.planChange.updateMany({
          where:
            change.action === "apply"
              ? {
                  id: change.id,
                  eventId: state.id,
                  status: "Pending",
                  baseVersion: state.version,
                }
              : {
                  id: change.id,
                  eventId: state.id,
                  status: "Applied",
                  appliedVersion: state.version,
                },
          data:
            change.action === "apply"
              ? { status: "Applied", appliedVersion: state.version + 1 }
              : { status: "Undone" },
        });
        if (!result.count)
          throw new AppError(
            409,
            "This plan change has already been resolved.",
          );
      }
      await tx.eventPreference.createMany({
        data: preferences.map((value) => ({ eventId: state.id, value })),
      });
      const budget = await tx.budget.upsert({
        where: { eventId: state.id },
        create: { eventId: state.id, contingency: state.contingency },
        update: { contingency: state.contingency },
      });
      await tx.budgetCategory.deleteMany({ where: { budgetId: budget.id } });
      await tx.budgetCategory.createMany({
        data: state.categories.map((c) => ({
          id: c.id,
          budgetId: budget.id,
          name: c.name,
          allocated: c.allocated,
          estimated: c.estimated,
          priority: c.priority,
          reasoning: c.reasoning,
        })),
      });
      await tx.task.deleteMany({ where: { eventId: state.id } });
      await tx.task.createMany({
        data: state.tasks.map((t) => ({
          id: t.id,
          eventId: state.id,
          title: t.title,
          description: t.description,
          category: t.category,
          priority: t.priority,
          status: t.status,
          dueDate: t.dueDate,
          estimatedCost: t.estimatedCost,
          owner: t.owner,
          dependencies: t.dependencies,
          generated: t.generated,
          customized: t.customized ?? false,
        })),
      });
      await tx.timelineItem.deleteMany({ where: { eventId: state.id } });
      await tx.timelineItem.createMany({
        data: state.timeline.map((t) => ({
          id: t.id,
          eventId: state.id,
          title: t.title,
          category: t.category,
          dueDate: t.dueDate,
          priority: t.priority,
          status: t.status,
          dependencies: t.dependencies,
        })),
      });
      for (const v of state.vendors) {
        const data = {
          name: v.name,
          status: v.status,
          estimatedCost: v.estimatedCost,
          bookingDeadline: v.bookingDeadline,
          selectionCriteria: v.selectionCriteria,
          questions: v.questions,
          notes: v.notes,
        };
        await tx.vendorCategory.upsert({
          where: { id: v.id },
          create: { id: v.id, eventId: state.id, ...data },
          update: data,
        });
      }
      await tx.recommendation.deleteMany({ where: { eventId: state.id } });
      await tx.recommendation.createMany({
        data: state.recommendations.map((r) => ({
          id: r.id,
          eventId: state.id,
          category: r.category,
          idea: r.idea,
          reason: r.reason,
          impact: r.impact,
          estimatedCost: r.estimatedCost,
          priority: r.priority,
        })),
      });
      await tx.risk.deleteMany({ where: { eventId: state.id } });
      await tx.risk.createMany({
        data: state.risks.map((r) => ({
          id: r.id,
          eventId: state.id,
          title: r.title,
          severity: r.severity,
          probability: r.probability,
          impact: r.impact,
          reason: r.reason,
          action: r.action,
        })),
      });
      const conversation = await tx.conversation.upsert({
        where: { eventId: state.id },
        create: { eventId: state.id },
        update: {},
      });
      if (messages.length)
        await tx.conversationMessage.createMany({
          data: messages.map((m) => ({
            conversationId: conversation.id,
            role: m.role,
            content: m.content,
          })),
        });
      if (actions.length)
        await tx.agentAction.createMany({
          data: actions.map((a) => ({
            eventId: state.id,
            tool: a.tool,
            summary: a.summary,
          })),
        });
    },
    { timeout: 20000 },
  );
  return get_event_state(state.id, userId);
}
export async function createEvent(input: EventInput, userId: string) {
  let state = create_event_plan(input, randomUUID());
  const actions: Action[] = [
    {
      tool: "create_event_plan",
      summary:
        "Created budget, timeline, tasks, service checklist, ideas and risk analysis.",
    },
  ];
  if (process.env.OPENAI_API_KEY) {
    try {
      const { runAgent } = await import("../agent/orchestrator");
      const result = await runAgent(
        state,
        "Create and personalize the complete event plan using my current requirements.",
      );
      state = result.state;
      actions.push(...result.actions);
    } catch {
      actions.push({
        tool: "ai_fallback",
        summary:
          "AI personalization was unavailable. Created a rule-based draft; retry personalization in the planner.",
      });
    }
  }
  return saveState(state, userId, actions, [], true);
}
export async function update_event_state(
  id: string,
  userId: string,
  patch: Partial<EventInput>,
) {
  const state = await get_event_state(id, userId);
  const input = eventSchema.parse({
    ...Object.fromEntries(
      Object.keys(eventSchema.shape).map((k) => [
        k,
        state[k as keyof EventState],
      ]),
    ),
    ...patch,
  });
  return saveState(create_event_plan(input, id, state), userId, [
    {
      tool: "update_event_state",
      summary: `Updated ${Object.keys(patch).join(", ")} and dependent plan.`,
    },
  ]);
}
