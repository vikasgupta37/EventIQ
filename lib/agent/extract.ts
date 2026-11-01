import { withAIExecution, MAX_AI_OUTPUT_TOKENS } from "./execution";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { eventSchema, type EventInput } from "../validation";
export const hasAI = () => Boolean(process.env.OPENAI_API_KEY);
export const aiClient = () =>
  new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 30000,
    maxRetries: 1,
  });
export const model = () => process.env.OPENAI_MODEL || "gpt-5.4-mini";
export function parseAmount(text: string) {
  const m = text
    .replace(/,/g, "")
    .match(
      /(?:₹|rs\.?\s*|inr\s*|\$)?\s*(\d+(?:\.\d+)?)\s*(lakh|lac|crore|million|k|thousand)?/i,
    );
  if (!m) return null;
  return Math.round(
    Number(m[1]) *
      ({
        lakh: 100000,
        lac: 100000,
        crore: 10000000,
        million: 1000000,
        k: 1000,
        thousand: 1000,
      }[m[2]?.toLowerCase() ?? ""] ?? 1),
  );
}
export function extractDemo(text: string): {
  event: EventInput;
  assumptions: string[];
  mode: string;
} {
  const eventType =
    (
      ["Wedding", "Birthday", "Community", "Corporate", "Private"] as const
    ).find((t) => text.toLowerCase().includes(t.toLowerCase())) ?? "Custom";
  const months = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];
  const month = months.findIndex((m) => text.toLowerCase().includes(m));
  const year = Number(
    text.match(/\b(20\d{2})\b/)?.[1] ?? new Date().getFullYear() + 1,
  );
  const date =
    text.match(/\b20\d{2}-\d{2}-\d{2}\b/)?.[0] ??
    `${year}-${String(month < 0 ? 1 : month + 1).padStart(2, "0")}-14`;
  const amount =
    text.match(
      /(?:₹|\$|INR\s*|Rs\.?\s*)[\d,.]+\s*(?:lakh|lac|crore|million|k|thousand)?/i,
    )?.[0] ?? text.match(/[\d,.]+\s*(?:lakh|lac|crore|million)\b/i)?.[0];
  const location =
    text.match(/(?:in|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)?.[1] ??
    (/delhi/i.test(text) ? "Delhi" : "Location to confirm");
  const event = eventSchema.parse({
    name: `${location} ${eventType}`,
    eventType,
    date,
    location,
    guestCount: Number(text.match(/(\d+)\s*guests/i)?.[1] ?? 100),
    budget: amount ? parseAmount(amount) : 500000,
    currency: text.includes("$") ? "USD" : "INR",
    theme: "Modern & personal",
    priorities: ["Photography", "Food", "Guest experience"].filter((p) =>
      new RegExp(p === "Food" ? "food|cater" : p, "i").test(text),
    ),
    preferences: [],
    sustainable: /eco.friend|sustainab/i.test(text),
    venueCapacity: null,
  });
  return {
    event,
    mode: "demo",
    assumptions: [
      "Offline demo extraction uses a limited parser. Review every field.",
      ...(!text.match(/\b20\d{2}-\d{2}-\d{2}\b/)
        ? ["Exact date was not provided; the 14th is a placeholder."]
        : []),
      ...(!amount ? ["Budget defaulted to 500,000; confirm your target."] : []),
      ...(!/\d+\s*guests/i.test(text) ? ["Guest count defaulted to 100."] : []),
    ],
  };
}
export function extract_event_details(text: string, signal?: AbortSignal) {
  return withAIExecution(
    signal,
    (signal) => extractDetails(text, signal),
    45_000,
  );
}
async function extractDetails(text: string, signal: AbortSignal) {
  if (!hasAI()) return extractDemo(text);
  const response = await aiClient().responses.parse(
    {
      model: model(),
      store: false,
      max_output_tokens: MAX_AI_OUTPUT_TOKENS,
      input: [
        {
          role: "system",
          content: `Extract event details. Today is ${new Date().toISOString().slice(0, 10)}. If the exact day is absent use day 14 and state that assumption in preferences. All missing values must be identified as assumptions in preferences. Never invent confirmed venues or costs.`,
        },
        { role: "user", content: text },
      ],
      text: {
        format: zodTextFormat(
          eventSchema.omit({ venueCapacity: true }).extend({
            venueCapacity: eventSchema.shape.venueCapacity.removeDefault(),
          }),
          "event_details",
        ),
      },
    },
    { signal, maxRetries: 0 },
  );
  if (!response.output_parsed)
    throw new Error(
      "The AI could not extract event details. Please use the form.",
    );
  return {
    event: eventSchema.parse(response.output_parsed),
    mode: "ai",
    assumptions: response.output_parsed.preferences,
  };
}
