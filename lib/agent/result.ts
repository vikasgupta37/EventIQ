import { z } from "zod";
import { eventStateSchema } from "../event-state-schema";
import type { EventState } from "../types";

const resultSchema = z.object({
  state: eventStateSchema,
  reply: z.string().min(1).max(5500),
  actions: z
    .array(
      z.object({
        tool: z.string().min(1).max(100),
        summary: z.string().max(6000),
      }),
    )
    .max(100),
  mode: z.enum(["ai", "demo"]),
});

/** A single trust boundary for browser and PostgreSQL planning results. */
export function validateAgentResult(initial: EventState, value: unknown) {
  const result = resultSchema.parse(value);
  if (
    result.state.id !== initial.id ||
    result.state.version !== initial.version
  )
    throw new Error(
      "The planner returned a different event or version. No changes were saved.",
    );
  return result;
}
