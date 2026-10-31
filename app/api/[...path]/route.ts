import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { currentUser, AppError } from "@/lib/auth";
import { db } from "@/lib/db/client";
import {
  createEvent,
  get_event_state,
  listEvents,
  saveState,
  update_event_state,
} from "@/lib/db/events";
import {
  eventSchema,
  eventPatchSchema,
  taskSchema,
  taskPatchSchema,
  vendorPatchSchema,
} from "@/lib/validation";
import { extract_event_details, hasAI } from "@/lib/agent/extract";
import { chat } from "@/lib/agent/orchestrator";
import { readAudioUpload, transcribeAudio } from "@/lib/voice";
import * as management from "@/lib/db/management";
import { listChanges, resolveChange } from "@/lib/db/changes";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const buckets = new Map<string, { count: number; reset: number }>();
async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const user = await currentUser();
    const { path } = await params;
    const [resource, id, section] = path;
    const method = request.method;
    if (method !== "GET") {
      const origin = request.headers.get("origin");
      const expectedOrigin =
        process.env.APP_ORIGIN ??
        `${request.nextUrl.protocol}//${request.headers.get("host") ?? request.nextUrl.host}`;
      if (origin && origin !== expectedOrigin)
        throw new AppError(403, "Cross-origin changes are not allowed.");
      const bucket = buckets.get(user.id);
      if (!bucket || bucket.reset < Date.now())
        buckets.set(user.id, { count: 1, reset: Date.now() + 60000 });
      else if (++bucket.count > 60)
        throw new AppError(429, "Too many requests. Please wait a minute.");
    }
    const body = async () => {
      const text = await request.text();
      if (text.length > 24000) throw new AppError(413, "Request is too large.");
      try {
        return JSON.parse(text);
      } catch {
        throw new AppError(400, "Invalid JSON.");
      }
    };
    if (resource === "health" && method === "GET")
      return NextResponse.json({ ok: true, mode: hasAI() ? "ai" : "demo" });
    if (resource === "extract" && method === "POST") {
      const { text } = z
        .object({ text: z.string().min(10).max(6000) })
        .parse(await body());
      return NextResponse.json(await extract_event_details(text));
    }
    if (resource === "events" && !id) {
      if (method === "GET")
        return NextResponse.json({
          events: await listEvents(user.id),
          mode: hasAI() ? "ai" : "demo",
        });
      if (method === "POST") {
        const input = eventSchema.parse(await body());
        await db.user.upsert({
          where: { id: user.id },
          create: user,
          update: {},
        });
        const state = await createEvent(input, user.id);
        return NextResponse.json(state, { status: 201 });
      }
    }
    if (resource === "events" && id) {
      if (section === "changes") {
        if (method === "GET" && !path[3])
          return NextResponse.json(await listChanges(id, user.id));
        if (method === "POST" && path[3]) {
          const action = z.enum(["apply", "discard", "undo"]).parse(path[4]);
          return NextResponse.json(
            await resolveChange(id, user.id, path[3], action),
          );
        }
      }
      if (section === "guests") {
        if (method === "GET" && !path[3])
          return NextResponse.json(await management.guests(id, user.id));
        if (method === "POST" && !path[3])
          return NextResponse.json(
            await management.saveGuest(id, user.id, await body()),
            { status: 201 },
          );
        if (method === "PATCH" && path[3])
          return NextResponse.json(
            await management.saveGuest(id, user.id, await body(), path[3]),
          );
        if (method === "DELETE" && path[3]) {
          await management.deleteGuest(id, user.id, path[3]);
          return new NextResponse(null, { status: 204 });
        }
      }
      if (section === "expenses") {
        if (method === "GET" && !path[3])
          return NextResponse.json(await management.expenses(id, user.id));
        if (method === "POST" && !path[3])
          return NextResponse.json(
            await management.saveExpense(id, user.id, await body()),
            { status: 201 },
          );
        if (method === "PATCH" && path[3] && !path[4])
          return NextResponse.json(
            await management.saveExpense(id, user.id, await body(), path[3]),
          );
        if (method === "DELETE" && path[3] && !path[4]) {
          await management.deleteExpense(id, user.id, path[3]);
          return new NextResponse(null, { status: 204 });
        }
        if (path[4] === "payments" && method === "POST" && !path[5])
          return NextResponse.json(
            await management.addPayment(id, user.id, path[3], await body()),
            { status: 201 },
          );
        if (path[4] === "payments" && method === "DELETE" && path[5]) {
          await management.deletePayment(id, user.id, path[3], path[5]);
          return new NextResponse(null, { status: 204 });
        }
      }
      if (section === "transcribe" && method === "POST") {
        await get_event_state(id, user.id);
        const audio = await readAudioUpload(request);
        return NextResponse.json(
          { text: await transcribeAudio(audio) },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
      if (!section && method === "GET")
        return NextResponse.json(await get_event_state(id, user.id));
      if (!section && method === "PATCH")
        return NextResponse.json(
          await update_event_state(
            id,
            user.id,
            eventPatchSchema.parse(await body()),
          ),
        );
      if (!section && method === "DELETE") {
        await get_event_state(id, user.id);
        await db.event.delete({ where: { id } });
        return new NextResponse(null, { status: 204 });
      }
      if (section === "chat" && method === "POST") {
        const { message } = z
          .object({ message: z.string().trim().min(1).max(6000) })
          .strict()
          .parse(await body());
        return NextResponse.json(await chat(id, user.id, message));
      }
      if (
        (section === "plan" ||
          (section === "budget" && path[3] === "rebalance")) &&
        method === "POST"
      )
        return NextResponse.json(
          await chat(
            id,
            user.id,
            "Rebalance and personalize the complete event plan using my current requirements.",
          ),
        );
      const state = await get_event_state(id, user.id);
      if (section === "tasks" && method === "POST") {
        const task = taskSchema.parse(await body());
        if (task.dueDate > state.date)
          throw new AppError(400, "Task date must be on or before the event.");
        if (task.dependencies.some((d) => !state.tasks.some((t) => t.id === d)))
          throw new AppError(400, "Unknown task dependency.");
        state.tasks.push({ ...task, id: randomUUID(), generated: false });
        return NextResponse.json(await saveState(state, user.id));
      }
      if (section === "vendors" && method === "POST") {
        const vendor = z
          .object({
            name: z.string().min(2).max(60),
            estimatedCost: z.number().int().min(0).max(1e9),
          })
          .strict()
          .parse(await body());
        state.vendors.push({
          ...vendor,
          id: randomUUID(),
          status: "Needed",
          bookingDeadline: state.date,
          selectionCriteria: ["Confirm scope, availability and written terms"],
          questions: ["What is included?"],
          notes: "",
        });
        return NextResponse.json(await saveState(state, user.id));
      }
      if (
        method === "GET" &&
        ["budget", "timeline", "tasks", "vendors", "ideas", "risks"].includes(
          section,
        )
      )
        return NextResponse.json(
          section === "budget"
            ? {
                total: state.budget,
                contingency: state.contingency,
                categories: state.categories,
              }
            : state[
                section === "ideas" ? "recommendations" : (section as "tasks")
              ],
        );
    }
    if (
      (resource === "tasks" || resource === "vendors") &&
      id &&
      ["PATCH", "DELETE"].includes(method)
    ) {
      const item =
        resource === "tasks"
          ? await db.task.findFirst({
              where: { id, event: { userId: user.id } },
            })
          : await db.vendorCategory.findFirst({
              where: { id, event: { userId: user.id } },
            });
      if (!item) throw new AppError(404, "Item not found.");
      const state = await get_event_state(item.eventId, user.id);
      if (resource === "tasks") {
        if (method === "DELETE") {
          state.suppressedTaskIds.push(id);
          state.tasks = state.tasks.filter((t) => t.id !== id);
          state.tasks.forEach(
            (t) => (t.dependencies = t.dependencies.filter((d) => d !== id)),
          );
        } else {
          const patch = taskPatchSchema.parse(await body());
          const task = state.tasks.find((t) => t.id === id)!;
          if (patch.dueDate && patch.dueDate > state.date)
            throw new AppError(
              400,
              "Task date must be on or before the event.",
            );
          if (
            patch.dependencies?.some(
              (d) => d === id || !state.tasks.some((t) => t.id === d),
            )
          )
            throw new AppError(400, "Invalid dependency.");
          if (
            patch.status === "Completed" &&
            (patch.dependencies ?? task.dependencies).some(
              (d) =>
                state.tasks.find((t) => t.id === d)?.status !== "Completed",
            )
          )
            throw new AppError(409, "Complete this task’s dependencies first.");
          Object.assign(task, patch);
          if (Object.keys(patch).some((k) => !["status", "owner"].includes(k)))
            task.customized = true;
        }
      } else {
        if (method === "DELETE")
          throw new AppError(405, "Vendor deletion is not supported.");
        Object.assign(
          state.vendors.find((v) => v.id === id)!,
          vendorPatchSchema.parse(await body()),
        );
      }
      return NextResponse.json(
        await saveState(state, user.id, [
          {
            tool: `${method.toLowerCase()}_${resource}`,
            summary: `${resource === "tasks" ? "Task" : "Service"} ${method === "DELETE" ? "deleted" : "updated"}.`,
          },
        ]),
      );
    }
    throw new AppError(404, "Endpoint not found.");
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: "Please check the provided fields.", details: error.issues },
        { status: 400 },
      );
    if (error instanceof AppError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    console.error(
      "EventIQ request failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      {
        error:
          "The request could not be completed. Your saved plan is safe. Check the database or AI connection and try again.",
      },
      { status: 503 },
    );
  }
}
export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
