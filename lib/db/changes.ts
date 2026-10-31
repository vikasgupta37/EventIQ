import { Prisma } from "@prisma/client";
import { db } from "./client";
import { get_event_state, saveState } from "./events";
import { AppError } from "../auth";
import { planDifferences } from "../changes";
import type { EventState, Action } from "../types";
import type { PlanChange } from "../management";
const select = {
  id: true,
  status: true,
  baseVersion: true,
  appliedVersion: true,
  request: true,
  explanation: true,
  differences: true,
  createdAt: true,
};
const json = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
export async function listChanges(
  id: string,
  userId: string,
): Promise<PlanChange[]> {
  await get_event_state(id, userId);
  const rows = await db.planChange.findMany({
    where: { eventId: id },
    select,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  })) as PlanChange[];
}
export async function stageResult(
  initial: EventState,
  userId: string,
  request: string,
  result: { state: EventState; reply: string; actions: Action[]; mode: string },
) {
  const differences = planDifferences(initial, result.state);
  const response = differences.length
    ? `Proposed changes — not applied yet. Review and apply the preview to update your event.\n\n${result.reply}`
    : result.reply;
  const pending = await db.$transaction(async (tx) => {
    const current = await tx.event.findFirst({
      where: { id: initial.id, userId },
    });
    if (!current) throw new AppError(404, "Event not found.");
    if (current.version !== initial.version)
      throw new AppError(
        409,
        "Your event changed while the planner was thinking. Please ask again.",
      );
    const change = differences.length
      ? await tx.planChange.create({
          data: {
            eventId: initial.id,
            baseVersion: initial.version,
            request,
            explanation: result.reply,
            before: json({ ...initial, messages: [], actions: [] }),
            after: json({ ...result.state, messages: [], actions: [] }),
            differences: json(differences),
            actions: json(result.actions),
          },
          select,
        })
      : null;
    const conversation = await tx.conversation.upsert({
      where: { eventId: initial.id },
      create: { eventId: initial.id },
      update: {},
    });
    await tx.conversationMessage.create({
      data: { conversationId: conversation.id, role: "user", content: request },
    });
    await tx.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: response,
      },
    });
    return change;
  });
  return {
    state: await get_event_state(initial.id, userId),
    mode: result.mode,
    reply: response,
    proposal: pending
      ? { ...pending, createdAt: pending.createdAt.toISOString() }
      : null,
  };
}
export async function resolveChange(
  eventId: string,
  userId: string,
  id: string,
  action: "apply" | "discard" | "undo",
) {
  const current = await get_event_state(eventId, userId);
  const change = await db.planChange.findFirst({ where: { id, eventId } });
  if (!change) throw new AppError(404, "Change preview not found.");
  if (action === "discard") {
    const result = await db.planChange.updateMany({
      where: { id, eventId, status: "Pending" },
      data: { status: "Discarded" },
    });
    if (!result.count)
      throw new AppError(409, "This preview is no longer pending.");
    return current;
  }
  const undo = action === "undo";
  if (
    undo
      ? change.status !== "Applied" || change.appliedVersion !== current.version
      : change.status !== "Pending" || change.baseVersion !== current.version
  )
    throw new AppError(
      409,
      undo
        ? "Newer edits prevent undoing this change. Ask the planner for a new change instead."
        : "This preview is stale or already resolved. Discard it and ask the planner again.",
    );
  const snapshot = JSON.parse(
    JSON.stringify(undo ? change.before : change.after),
  ) as EventState;
  snapshot.id = eventId;
  snapshot.version = current.version;
  return saveState(
    snapshot,
    userId,
    [
      {
        tool: undo ? "undo_plan_change" : "apply_plan_change",
        summary: `${undo ? "Undid" : "Applied"} approved plan change: ${change.request}`,
      },
    ],
    [
      {
        role: "assistant",
        content: undo
          ? "The approved change was undone. Your earlier plan is restored; conversation and guest/payment records are retained."
          : "Your reviewed changes have been applied and saved.",
      },
    ],
    false,
    { id, action: undo ? "undo" : "apply" },
  );
}
