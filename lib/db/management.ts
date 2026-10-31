import { Prisma } from "@prisma/client";
import { db } from "./client";
import { AppError } from "../auth";
import { guestSchema, expenseSchema, paymentSchema } from "../management";
import { today } from "../engines";
export async function ownedEvent(id: string, userId: string) {
  const event = await db.event.findFirst({ where: { id, userId } });
  if (!event) throw new AppError(404, "Event not found.");
  return event;
}
/** Every record edit advances the event version, invalidating stale AI previews. */
async function edit<T>(
  eventId: string,
  userId: string,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  const event = await ownedEvent(eventId, userId);
  return db.$transaction(async (tx) => {
    const lock = await tx.event.updateMany({
      where: { id: eventId, userId, version: event.version },
      data: { version: { increment: 1 } },
    });
    if (!lock.count)
      throw new AppError(409, "This event changed. Refresh and try again.");
    return operation(tx);
  });
}
export async function guests(eventId: string, userId: string) {
  await ownedEvent(eventId, userId);
  return db.guest.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
  });
}
export async function saveGuest(
  eventId: string,
  userId: string,
  input: unknown,
  id?: string,
) {
  const data = guestSchema.parse(input);
  return edit(eventId, userId, async (tx) => {
    if (!id) return tx.guest.create({ data: { eventId, ...data } });
    const result = await tx.guest.updateMany({ where: { id, eventId }, data });
    if (!result.count) throw new AppError(404, "Guest not found.");
    return tx.guest.findUniqueOrThrow({ where: { id } });
  });
}
export async function deleteGuest(eventId: string, userId: string, id: string) {
  return edit(eventId, userId, async (tx) => {
    const result = await tx.guest.deleteMany({ where: { id, eventId } });
    if (!result.count) throw new AppError(404, "Guest not found.");
  });
}
export async function expenses(eventId: string, userId: string) {
  await ownedEvent(eventId, userId);
  return db.expense.findMany({
    where: { eventId },
    include: { payments: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "asc" },
  });
}
export async function saveExpense(
  eventId: string,
  userId: string,
  input: unknown,
  id?: string,
) {
  const data = expenseSchema.parse(input);
  return edit(eventId, userId, async (tx) => {
    if (!id) return tx.expense.create({ data: { eventId, ...data } });
    const existing = await tx.expense.findFirst({
      where: { id, eventId },
      include: { payments: true },
    });
    if (!existing) throw new AppError(404, "Expense not found.");
    const paid = existing.payments.reduce((s, p) => s + p.amount, 0);
    if (data.amount < paid || (paid > 0 && data.status !== "Confirmed"))
      throw new AppError(
        409,
        "Remove or correct recorded payments before reducing the amount below paid or reverting to a quote.",
      );
    return tx.expense.update({ where: { id }, data });
  });
}
export async function deleteExpense(
  eventId: string,
  userId: string,
  id: string,
) {
  return edit(eventId, userId, async (tx) => {
    const result = await tx.expense.deleteMany({ where: { id, eventId } });
    if (!result.count) throw new AppError(404, "Expense not found.");
  });
}
export async function addPayment(
  eventId: string,
  userId: string,
  expenseId: string,
  input: unknown,
) {
  const data = paymentSchema.parse(input);
  if (data.paidOn > today())
    throw new AppError(400, "Recorded payments cannot have a future date.");
  return edit(eventId, userId, async (tx) => {
    const expense = await tx.expense.findFirst({
      where: { id: expenseId, eventId },
      include: { payments: true },
    });
    if (!expense) throw new AppError(404, "Expense not found.");
    if (expense.status !== "Confirmed")
      throw new AppError(
        409,
        "Confirm the expense before recording a payment.",
      );
    const paid = expense.payments.reduce((s, p) => s + p.amount, 0);
    if (paid + data.amount > expense.amount)
      throw new AppError(409, "This payment exceeds the outstanding balance.");
    return tx.payment.create({ data: { expenseId, ...data } });
  });
}
export async function deletePayment(
  eventId: string,
  userId: string,
  expenseId: string,
  id: string,
) {
  return edit(eventId, userId, async (tx) => {
    const result = await tx.payment.deleteMany({
      where: { id, expenseId, expense: { eventId } },
    });
    if (!result.count) throw new AppError(404, "Payment not found.");
  });
}
