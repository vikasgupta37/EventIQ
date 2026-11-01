import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "../auth";
import { readJsonBody } from "../request-body";
import { eventStateSchema } from "../event-state-schema";
import { hasAI, extract_event_details } from "../agent/extract";
import { runAgent } from "../agent/orchestrator";
import { readAudioUpload, transcribeAudio } from "../voice";
import { PublicRequestGate } from "./public-request-gate";
const gate = new PublicRequestGate();
export const limitPublicRequests = (ip: string, now?: number) =>
  gate.count(ip, now);
export async function browserHandler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  let release: (() => void) | undefined;
  try {
    const { path } = await params;
    if (request.method === "GET" && path.join("/") === "health")
      return NextResponse.json(
        { ok: true, storage: "browser", mode: hasAI() ? "ai" : "demo" },
        { headers: { "Cache-Control": "no-store" } },
      );
    const endpoint = path.join("/");
    if (
      request.method !== "POST" ||
      !["demo/extract", "demo/plan", "demo/transcribe"].includes(endpoint)
    )
      throw new AppError(
        404,
        "Events are stored in your browser. This server does not store event records.",
      );
    const expected = process.env.APP_ORIGIN || request.nextUrl.origin;
    if (request.headers.get("origin") !== expected)
      throw new AppError(
        403,
        "Open EventIQ in its own browser tab to use the planner.",
      );
    const ip =
      request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
      "local";
    limitPublicRequests(ip);
    if (endpoint === "demo/transcribe") {
      const audio = await readAudioUpload(request);
      release = gate.acquire(ip);
      return NextResponse.json({
        text: await transcribeAudio(audio, request.signal),
      });
    }
    const body = await readJsonBody(request, 256 * 1024);
    if (endpoint === "demo/extract") {
      const { text } = z
        .object({ text: z.string().trim().min(10).max(6000) })
        .strict()
        .parse(body);
      release = gate.acquire(ip);
      return NextResponse.json(
        await extract_event_details(text, request.signal),
      );
    }
    const { state, message } = z
      .object({
        state: eventStateSchema,
        message: z.string().trim().min(1).max(6000),
      })
      .strict()
      .parse(body);
    release = gate.acquire(ip);
    const result = await runAgent(state, message, request.signal);
    // Validate model-generated state before allowing the browser to stage it.
    return NextResponse.json({
      ...result,
      state: eventStateSchema.parse(result.state),
    });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: "Please check the event details or shorten the request." },
        { status: 400 },
      );
    if (error instanceof AppError)
      return NextResponse.json(
        { error: error.message },
        {
          status: error.status,
          headers: error.status === 429 ? { "Retry-After": "60" } : undefined,
        },
      );
    return NextResponse.json(
      {
        error:
          "AI is temporarily unavailable. Your browser-saved plan has not changed. You can still edit it manually.",
      },
      { status: 503 },
    );
  } finally {
    release?.();
  }
}
