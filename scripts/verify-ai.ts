import "dotenv/config";
import { runAgent } from "../lib/agent/orchestrator";
import { create_event_plan } from "../lib/engines";
import { extractDemo, hasAI } from "../lib/agent/extract";

// Live tool-calling smoke test against an isolated draft. No saved events change.
if (!hasAI())
  throw new Error("Configure OPENAI_API_KEY before running this check.");
const input = extractDemo(
  "Wedding in Delhi, February 2027, 250 guests, INR 12 lakh budget.",
).event;
const initial = create_event_plan(input, "live-ai-check");
try {
  const result = await runAgent(
    initial,
    "Set my total budget to INR 1000000, increase the guest count to 350, and make the event eco-friendly. Apply all three changes to the event.",
  );
  if (
    result.state.budget !== 1000000 ||
    result.state.guestCount !== 350 ||
    !result.state.sustainable ||
    !result.actions.length
  ) {
    throw new Error("The model did not apply every requested change.");
  }
  if (initial.budget !== input.budget)
    throw new Error("The original draft was unexpectedly modified.");
  console.log(
    JSON.stringify({
      verified: true,
      mode: result.mode,
      budget: result.state.budget,
      guests: result.state.guestCount,
      sustainable: result.state.sustainable,
      actions: result.actions.length,
      savedEventsChanged: false,
    }),
  );
} catch (error) {
  // Never dump SDK request objects, which may contain authentication headers.
  console.error(
    error instanceof Error ? error.message : "Live AI verification failed.",
  );
  process.exitCode = 1;
}
