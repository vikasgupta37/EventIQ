import { z } from "zod";
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Use a valid calendar date",
  );
export const eventSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    eventType: z.enum([
      "Wedding",
      "Birthday",
      "Community",
      "Corporate",
      "Private",
      "Custom",
    ]),
    date: dateSchema,
    location: z.string().trim().min(2).max(150),
    guestCount: z.number().int().min(1).max(100000),
    budget: z.number().int().min(100).max(1000000000),
    currency: z.enum(["INR", "USD", "EUR", "GBP"]),
    theme: z.string().max(200),
    priorities: z.array(z.string().max(100)).max(12),
    preferences: z.array(z.string().max(300)).max(30),
    sustainable: z.boolean(),
    venueCapacity: z.number().int().positive().nullable().default(null),
  })
  .strict();
export const taskSchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    description: z.string().max(2000).default(""),
    category: z.string().min(1).max(60).default("Planning"),
    priority: z.enum(["High", "Medium", "Low"]).default("Medium"),
    status: z
      .enum(["Not Started", "In Progress", "Completed", "Blocked"])
      .default("Not Started"),
    dueDate: dateSchema,
    estimatedCost: z.number().int().min(0).max(1000000000).default(0),
    owner: z.string().max(100).default("You"),
    dependencies: z.array(z.string().max(100)).max(30).default([]),
  })
  .strict();
export const vendorPatchSchema = z
  .object({
    status: z
      .enum(["Needed", "Shortlisted", "Contacted", "Booked", "Rejected"])
      .optional(),
    notes: z.string().max(2000).optional(),
    estimatedCost: z.number().int().min(0).max(1000000000).optional(),
  })
  .strict();
// Creation defaults must never be applied to omitted PATCH fields.
export const eventPatchSchema = eventSchema
  .extend({
    venueCapacity: eventSchema.shape.venueCapacity.removeDefault(),
  })
  .partial();
export const taskPatchSchema = taskSchema
  .extend({
    description: taskSchema.shape.description.removeDefault(),
    category: taskSchema.shape.category.removeDefault(),
    priority: taskSchema.shape.priority.removeDefault(),
    status: taskSchema.shape.status.removeDefault(),
    estimatedCost: taskSchema.shape.estimatedCost.removeDefault(),
    owner: taskSchema.shape.owner.removeDefault(),
    dependencies: taskSchema.shape.dependencies.removeDefault(),
  })
  .partial();
export type EventInput = z.infer<typeof eventSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
