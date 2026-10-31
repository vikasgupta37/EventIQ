// @vitest-environment jsdom
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  browserApi,
  browserDataKey,
  exportBrowserData,
  importBrowserData,
} from "../lib/browser-store";
import { create_event_plan } from "../lib/engines";
import type { EventState } from "../lib/types";
import type { PlanChange, Expense, Guest } from "../lib/management";
const input: import("../lib/validation").EventInput = {
  name: "Browser wedding",
  eventType: "Wedding",
  date: "2027-02-14",
  location: "Delhi",
  guestCount: 250,
  budget: 1200000,
  currency: "INR",
  theme: "Modern",
  priorities: [],
  preferences: [],
  sustainable: false,
  venueCapacity: null,
};
const create = () => browserApi<EventState>("events", "POST", input);
const guest = {
  name: "Maya Shah",
  email: "maya@example.com",
  phone: "",
  rsvp: "Accepted",
  plusOnes: 1,
  dietary: "",
  tableName: "",
  notes: "",
};
const expense = {
  title: "Venue booking",
  category: "Venue",
  supplier: "",
  amount: 10000,
  status: "Confirmed",
  dueDate: null,
  notes: "",
};
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ mode: "demo" }))),
  );
});
afterEach(() => vi.unstubAllGlobals());
describe("Public browser persistence", () => {
  it("creates, refreshes and deletes an event without a server mutation", async () => {
    const event = await create();
    expect((await browserApi<EventState>("events/" + event.id)).name).toBe(
      input.name,
    );
    expect(
      JSON.parse(localStorage.getItem(browserDataKey)!).events,
    ).toHaveLength(1);
    expect(fetch).not.toHaveBeenCalled();
    await browserApi("events/" + event.id, "DELETE");
    await expect(browserApi("events/" + event.id)).rejects.toThrow("not found");
  });
  it("preserves the previous save when browser quota prevents a write", async () => {
    const event = await create();
    const before = exportBrowserData();
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("quota");
      });
    await expect(
      browserApi("events/" + event.id, "PATCH", { name: "New name" }),
    ).rejects.toThrow("could not save");
    spy.mockRestore();
    expect(exportBrowserData()).toBe(before);
  });
  it("reports corrupt storage without overwriting it", async () => {
    localStorage.setItem(browserDataKey, "not json");
    await expect(create()).rejects.toThrow("could not be read");
    expect(exportBrowserData()).toBe("not json");
  });
  it("round trips backups and rejects duplicate imports", async () => {
    const event = await create();
    const backup = exportBrowserData();
    localStorage.clear();
    await importBrowserData(backup);
    expect((await browserApi<EventState>("events/" + event.id)).budget).toBe(
      input.budget,
    );
    await expect(importBrowserData(backup)).rejects.toThrow("already exists");
  });
  it("enforces task dependencies and leaves invalid edits unsaved", async () => {
    const event = await create();
    const dependent = event.tasks.find((t) => t.dependencies.length)!;
    const before = exportBrowserData();
    await expect(
      browserApi("tasks/" + dependent.id, "PATCH", { status: "Completed" }),
    ).rejects.toThrow("dependencies first");
    expect(exportBrowserData()).toBe(before);
    await expect(
      browserApi("tasks/" + event.tasks[0].id, "PATCH", {
        dependencies: [event.tasks[0].id],
      }),
    ).rejects.toThrow("cycle");
    expect(exportBrowserData()).toBe(before);
  });
  it("persists guest and expense records and prevents overpayment", async () => {
    const event = await create();
    const base = "events/" + event.id;
    await browserApi(base + "/guests", "POST", guest);
    const e = await browserApi<Expense>(base + "/expenses", "POST", expense);
    await browserApi(base + "/expenses/" + e.id + "/payments", "POST", {
      amount: 4000,
      paidOn: "2026-10-01",
      reference: "deposit",
    });
    await expect(
      browserApi(base + "/expenses/" + e.id + "/payments", "POST", {
        amount: 7000,
        paidOn: "2026-10-01",
        reference: "",
      }),
    ).rejects.toThrow("outstanding");
    await expect(
      browserApi(base + "/expenses/" + e.id, "PATCH", {
        ...expense,
        amount: 3000,
      }),
    ).rejects.toThrow("below paid");
    expect(await browserApi<Guest[]>(base + "/guests")).toHaveLength(1);
    expect(
      (await browserApi<Expense[]>(base + "/expenses"))[0].payments,
    ).toHaveLength(1);
  });
  it("blocks currency changes with existing expense records", async () => {
    const event = await create();
    await browserApi("events/" + event.id + "/expenses", "POST", expense);
    await expect(
      browserApi("events/" + event.id, "PATCH", { currency: "USD" }),
    ).rejects.toThrow("currency");
  });
  it("stages, applies, and undoes AI changes while retaining records and conversation", async () => {
    const event = await create();
    const base = "events/" + event.id;
    await browserApi(base + "/guests", "POST", guest);
    const before = await browserApi<EventState>(base);
    vi.mocked(fetch).mockImplementation(async (_url, init) => {
      const request = JSON.parse(init?.body as string);
      expect(request.state.guests).toBeUndefined();
      return new Response(
        JSON.stringify({
          state: create_event_plan(
            { ...input, budget: 1000000 },
            event.id,
            request.state,
          ),
          reply: "A proposed budget.",
          actions: [],
          mode: "ai",
        }),
      );
    });
    const result = await browserApi<{
      state: EventState;
      proposal: PlanChange;
    }>(base + "/chat", "POST", { message: "Reduce the budget" });
    expect(result.state.budget).toBe(input.budget);
    expect(result.proposal.status).toBe("Pending");
    const applied = await browserApi<EventState>(
      base + "/changes/" + result.proposal.id + "/apply",
      "POST",
    );
    expect(applied.budget).toBe(1000000);
    const undone = await browserApi<EventState>(
      base + "/changes/" + result.proposal.id + "/undo",
      "POST",
    );
    expect(undone.budget).toBe(before.budget);
    expect(undone.messages).toHaveLength(4);
    expect(await browserApi(base + "/guests")).toHaveLength(1);
  });
  it("rejects an AI response when a manual edit happened while it was running", async () => {
    const event = await create();
    let reply!: (r: Response) => void;
    let started!: () => void;
    const ready = new Promise<void>((r) => (started = r));
    vi.mocked(fetch).mockImplementation(() => {
      started();
      return new Promise<Response>((r) => (reply = r));
    });
    const pending = browserApi("events/" + event.id + "/chat", "POST", {
      message: "Change budget",
    });
    await ready;
    await browserApi("events/" + event.id, "PATCH", {
      name: "Changed manually",
    });
    reply(
      new Response(
        JSON.stringify({
          state: event,
          reply: "Done",
          actions: [],
          mode: "ai",
        }),
      ),
    );
    await expect(pending).rejects.toThrow("changed while");
    expect((await browserApi<EventState>("events/" + event.id)).name).toBe(
      "Changed manually",
    );
  });
  it("invalidates a preview after a guest edit", async () => {
    const event = await create();
    const base = "events/" + event.id;
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          state: create_event_plan(
            { ...input, budget: 900000 },
            event.id,
            event,
          ),
          reply: "Proposed",
          actions: [],
          mode: "ai",
        }),
      ),
    );
    const result = await browserApi<{ proposal: PlanChange }>(
      base + "/chat",
      "POST",
      { message: "Change budget" },
    );
    await browserApi(base + "/guests", "POST", guest);
    await expect(
      browserApi(base + "/changes/" + result.proposal.id + "/apply", "POST"),
    ).rejects.toThrow("stale");
  });
});
