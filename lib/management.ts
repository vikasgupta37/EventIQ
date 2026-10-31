import { z } from "zod";
import { dateSchema } from "./validation";
export const guestSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.union([z.email(), z.literal("")]),
    phone: z.string().max(40),
    rsvp: z.enum(["Pending", "Accepted", "Declined"]),
    plusOnes: z.number().int().min(0).max(10),
    dietary: z.string().max(300),
    tableName: z.string().max(60),
    notes: z.string().max(1000),
  })
  .strict();
export const expenseSchema = z
  .object({
    title: z.string().trim().min(2).max(120),
    category: z.string().trim().min(1).max(60),
    supplier: z.string().max(120),
    amount: z.number().int().min(1).max(1000000000),
    status: z.enum(["Quoted", "Confirmed"]),
    dueDate: dateSchema.nullable(),
    notes: z.string().max(1000),
  })
  .strict();
export const paymentSchema = z
  .object({
    amount: z.number().int().min(1).max(1000000000),
    paidOn: dateSchema,
    reference: z.string().max(160),
  })
  .strict();
export type GuestInput = z.infer<typeof guestSchema>;
export type Guest = GuestInput & { id: string };
export type Payment = z.infer<typeof paymentSchema> & { id: string };
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type Expense = ExpenseInput & { id: string; payments: Payment[] };
export function guestSummary(guests: Guest[]) {
  return {
    invited: guests.reduce((s, g) => s + 1 + g.plusOnes, 0),
    confirmed: guests
      .filter((g) => g.rsvp === "Accepted")
      .reduce((s, g) => s + 1 + g.plusOnes, 0),
    pending: guests
      .filter((g) => g.rsvp === "Pending")
      .reduce((s, g) => s + 1 + g.plusOnes, 0),
    declined: guests
      .filter((g) => g.rsvp === "Declined")
      .reduce((s, g) => s + 1 + g.plusOnes, 0),
  };
}
export function expenseSummary(expenses: Expense[]) {
  const confirmed = expenses.filter((e) => e.status === "Confirmed");
  const committed = confirmed.reduce((s, e) => s + e.amount, 0);
  const paid = expenses.reduce(
    (s, e) => s + e.payments.reduce((n, p) => n + p.amount, 0),
    0,
  );
  return {
    quoted: expenses
      .filter((e) => e.status === "Quoted")
      .reduce((s, e) => s + e.amount, 0),
    committed,
    paid,
    outstanding: committed - paid,
  };
}
export type Difference = {
  section: string;
  label: string;
  before: string;
  after: string;
};
export type PlanChange = {
  id: string;
  status: "Pending" | "Applied" | "Discarded" | "Undone";
  baseVersion: number;
  appliedVersion: number | null;
  request: string;
  explanation: string;
  differences: Difference[];
  createdAt: string;
};
