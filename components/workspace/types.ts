import type { EventState } from "@/lib/types";
export type EventSummary = Pick<
  EventState,
  "id" | "name" | "date" | "eventType"
>;
export type Mutate = (
  path: string,
  method: string,
  body?: unknown,
) => Promise<boolean>;
