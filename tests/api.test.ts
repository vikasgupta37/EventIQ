vi.mock("../lib/rate-limit", () => ({ limitRequests: vi.fn() }));
import "dotenv/config";
import { describe, it, expect, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, PATCH, DELETE } from "../app/api/[...path]/route";
import { db } from "../lib/db/client";
import { extractDemo } from "../lib/agent/extract";
import { get_event_state, saveState } from "../lib/db/events";
import type { EventState } from "../lib/types";
const ids: string[] = [];
process.env.DEMO_MODE = "true";
process.env.OPENAI_API_KEY = "";
async function request(path: string, method = "GET", body?: unknown) {
  const req = new NextRequest(`http://localhost:3000/api/${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return ({ GET, POST, PATCH, DELETE } as Record<string, typeof GET>)[method](
    req,
    { params: Promise.resolve({ path: path.split("/") }) },
  );
}
afterAll(async () => {
  if (ids.length)
    await db.event.deleteMany({
      where: { id: { in: ids }, userId: "demo-user" },
    });
  await db.$disconnect();
});
describe("PostgreSQL API integration", () => {
  it("creates, updates and persists the complete demo journey", async () => {
    const extraction = await request("extract", "POST", {
      text: "Wedding in Delhi, February 2027, 250 guests, ₹12 lakh budget.",
    });
    expect(extraction.status).toBe(200);
    const input = (await extraction.json()).event;
    const created = await request("events", "POST", {
      ...input,
      name: "Integration test event",
    });
    expect(created.status).toBe(201);
    let s: EventState = await created.json();
    ids.push(s.id);
    expect(s.tasks.length).toBeGreaterThan(5);
    expect(s.categories).toHaveLength(10);
    expect(s.vendors.length).toBeGreaterThan(5);
    for (const [message, field, value] of [
      ["Reduce my budget to ₹10 lakh.", "budget", 1000000],
      ["Increase guests to 350.", "guestCount", 350],
      ["Make it eco-friendly.", "sustainable", true],
      ["Move the event to March.", "date", "2027-03-14"],
    ] as const) {
      const r = await request(`events/${s.id}/chat`, "POST", { message });
      expect(r.status).toBe(200);
      const proposed = await r.json();
      expect(proposed.proposal.status).toBe("Pending");
      expect(proposed.state[field]).toBe(s[field]);
      const applied = await request(
        `events/${s.id}/changes/${proposed.proposal.id}/apply`,
        "POST",
        {},
      );
      expect(applied.status).toBe(200);
      s = await applied.json();
      expect(s[field]).toBe(value);
      const loaded = await request(`events/${s.id}`);
      expect((await loaded.json())[field]).toBe(value);
    }
    expect(s.messages).toHaveLength(12);
    expect(s.actions.length).toBeGreaterThan(4);
    const venueTask = s.tasks.find((t) => t.category === "Venue")!;
    const taskUpdate = await request(`tasks/${venueTask.id}`, "PATCH", {
      status: "Completed",
    });
    expect(taskUpdate.status).toBe(200);
    const updatedTask = (await taskUpdate.json()).tasks.find(
      (t: { id: string }) => t.id === venueTask.id,
    );
    expect(updatedTask).toMatchObject({
      category: "Venue",
      priority: "High",
      description: venueTask.description,
      status: "Completed",
      customized: false,
    });
    await request(`events/${s.id}`, "PATCH", { venueCapacity: 500 });
    const budgetUpdate = await request(`events/${s.id}`, "PATCH", {
      budget: 1100000,
    });
    expect((await budgetUpdate.json()).venueCapacity).toBe(500);
    const added = await request(`events/${s.id}/tasks`, "POST", {
      title: "Confirm cake tasting",
      dueDate: "2027-02-01",
    });
    expect(added.status).toBe(200);
    s = await added.json();
    const task = s.tasks.find((t) => t.title === "Confirm cake tasting")!;
    expect(
      (await request(`tasks/${task.id}`, "PATCH", { status: "Completed" }))
        .status,
    ).toBe(200);
    expect(
      (
        await request(`vendors/${s.vendors[0].id}`, "PATCH", {
          status: "Booked",
          notes: "Test booking",
        })
      ).status,
    ).toBe(200);
    expect(
      (await request(`events/${s.id}/budget/rebalance`, "POST", {})).status,
    ).toBe(200);
    const persisted = await get_event_state(s.id, "demo-user");
    expect(persisted.tasks.find((t) => t.id === task.id)?.status).toBe(
      "Completed",
    );
    expect(
      persisted.vendors.find((v) => v.id === s.vendors[0].id)?.status,
    ).toBe("Booked");
    for (const section of [
      "budget",
      "timeline",
      "tasks",
      "vendors",
      "ideas",
      "risks",
    ])
      expect((await request(`events/${s.id}/${section}`)).status).toBe(200);
    expect((await request(`tasks/${task.id}`, "DELETE")).status).toBe(200);
  });
  it("rejects invalid inputs and cross-origin writes", async () => {
    expect((await request("events", "POST", { budget: -1 })).status).toBe(400);
    const r = await POST(
      new NextRequest("http://localhost:3000/api/events", {
        method: "POST",
        headers: { origin: "https://untrusted.example" },
        body: "{}",
      }),
      { params: Promise.resolve({ path: ["events"] }) },
    );
    expect(r.status).toBe(403);
  });
  it("enforces ownership and rejects stale updates", async () => {
    const s = await get_event_state(ids[0], "demo-user");
    await expect(get_event_state(ids[0], "another-user")).rejects.toThrow(
      "Event not found",
    );
    await saveState(s, "demo-user");
    await expect(saveState(s, "demo-user")).rejects.toThrow(
      "changed in another request",
    );
  });
  it("blocks deadlines beyond the event and unknown dependencies", async () => {
    const id = ids[0];
    expect(
      (
        await request(`events/${id}/tasks`, "POST", {
          title: "Bad date",
          dueDate: "2099-01-01",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(`events/${id}/tasks`, "POST", {
          title: "Bad dependency",
          dueDate: "2027-01-01",
          dependencies: ["unknown"],
        })
      ).status,
    ).toBe(400);
  });
  it("deletes an owned event and its related records", async () => {
    const r = await request("events", "POST", {
      ...extractDemo("Wedding in Delhi 250 guests ₹12 lakh February 2027")
        .event,
      name: "Delete test",
    });
    const s: EventState = await r.json();
    ids.push(s.id);
    expect((await request(`events/${s.id}`, "DELETE")).status).toBe(204);
    expect(await db.task.count({ where: { eventId: s.id } })).toBe(0);
    expect((await request(`events/${s.id}`)).status).toBe(404);
  });
});
