import "dotenv/config";
import { readFile } from "node:fs/promises";
import { transcribeAudio } from "../lib/voice";
import { runAgent } from "../lib/agent/orchestrator";
import { extractDemo } from "../lib/agent/extract";
import { create_event_plan } from "../lib/engines";
// Uses an explicitly supplied synthetic fixture, never a live microphone.
const path = process.argv[2];
if (!path)
  throw new Error(
    "Usage: pnpm exec tsx scripts/verify-voice.ts synthetic-fixture.wav",
  );
try {
  const bytes = await readFile(path);
  const text = await transcribeAudio(
    new File([bytes], "fixture.wav", { type: "audio/wav" }),
  );
  const initial = create_event_plan(
    extractDemo("Wedding in Delhi February 2027 250 guests INR 12 lakh").event,
    "voice-check",
  );
  const result = await runAgent(initial, text);
  if (result.state.guestCount !== 350)
    throw new Error("Expected the synthetic request to set 350 guests.");
  console.log(
    JSON.stringify({
      verified: true,
      transcript: text,
      guests: result.state.guestCount,
      savedEventsChanged: false,
    }),
  );
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Voice verification failed.",
  );
  process.exitCode = 1;
}
