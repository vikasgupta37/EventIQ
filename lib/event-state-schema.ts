import { z } from "zod";
import { eventSchema, taskSchema, dateSchema } from "./validation";
const id = z.string().min(1).max(160);
const text = z.string().max(6000);
const strings = z.array(z.string().max(1000)).max(40);
const amount = z.number().int().min(0).max(1e10);
export const eventStateSchema = eventSchema
  .extend({
    id,
    version: z.number().int().min(1),
    updatedAt: z.string().max(40),
    suppressedTaskIds: z.array(id).max(300),
    budgetOverrides: z.record(z.string().max(60), amount),
    contingency: amount,
    progress: z.number().min(0).max(100),
    categories: z
      .array(
        z.object({
          id,
          name: z.string().max(60),
          allocated: amount,
          estimated: amount,
          priority: text,
          reasoning: text,
        }),
      )
      .max(30),
    tasks: z
      .array(
        taskSchema.extend({
          id,
          generated: z.boolean(),
          customized: z.boolean().optional(),
        }),
      )
      .max(300),
    timeline: z
      .array(
        z.object({
          id,
          title: text,
          category: text,
          dueDate: dateSchema,
          priority: text,
          status: text,
          dependencies: z.array(id).max(30),
        }),
      )
      .max(300),
    vendors: z
      .array(
        z.object({
          id,
          name: z.string().max(60),
          status: z.enum([
            "Needed",
            "Shortlisted",
            "Contacted",
            "Booked",
            "Rejected",
          ]),
          estimatedCost: amount,
          bookingDeadline: dateSchema,
          selectionCriteria: strings,
          questions: strings,
          notes: text,
        }),
      )
      .max(100),
    recommendations: z
      .array(
        z.object({
          id,
          category: text,
          idea: text,
          reason: text,
          impact: text,
          estimatedCost: amount,
          priority: text,
        }),
      )
      .max(100),
    risks: z
      .array(
        z.object({
          id,
          title: text,
          severity: text,
          probability: text,
          impact: text,
          reason: text,
          action: text,
        }),
      )
      .max(100),
    messages: z
      .array(
        z.object({
          id: id.optional(),
          role: z.enum(["user", "assistant"]),
          content: text,
          createdAt: z.string().max(40).optional(),
        }),
      )
      .max(200),
    actions: z
      .array(
        z.object({
          id: id.optional(),
          tool: text,
          summary: text,
          createdAt: z.string().max(40).optional(),
        }),
      )
      .max(100),
  })
  .strip();
