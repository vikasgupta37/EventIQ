vi.mock("../lib/rate-limit", () => ({ limitRequests: vi.fn() }));
import { vi } from "vitest";
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, PATCH, DELETE } from "../app/api/[...path]/route";
import { db } from "../lib/db/client";
import { createEvent, get_event_state } from "../lib/db/events";
import { guests, expenses } from "../lib/db/management";
import { extractDemo } from "../lib/agent/extract";
import { guestSummary, expenseSummary } from "../lib/management";
import { planDifferences } from "../lib/changes";
import type { EventState } from "../lib/types";
process.env.DEMO_MODE = "true";
process.env.OPENAI_API_KEY = "";
const ids: string[] = [];
let state: EventState;
let other: EventState;
const guest = {
  name: "Test Guest",
  email: "guest@example.test",
  phone: "",
  rsvp: "Accepted",
  plusOnes: 2,
  dietary: "Vegetarian",
  tableName: "Table 1",
  notes: "",
};
const expense = {
  title: "Venue deposit agreement",
  category: "Venue",
  supplier: "Test venue",
  amount: 10000,
  status: "Quoted",
  dueDate: "2027-01-01",
  notes: "",
};
async function request(path: string, method = "GET", body?: unknown) {
  return ({ GET, POST, PATCH, DELETE } as Record<string, typeof GET>)[method](
    new NextRequest(`http://localhost:3000/api/${path}`, {
      method,
      headers: { "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }),
    { params: Promise.resolve({ path: path.split("/") }) },
  );
}
const path = (tail = "") => `events/${state.id}${tail}`;
async function propose(message = "Reduce my budget to ₹10 lakh.") {
  const result = await request(path("/chat"), "POST", { message });
  expect(result.status).toBe(200);
  return result.json();
}
beforeAll(async () => {
  // This suite must work on a fresh database, without seeds or another test suite.
  await db.user.upsert({
    where: { id: "demo-user" },
    create: {
      id: "demo-user",
      email: "demo@eventiq.local",
      name: "Demo Planner",
    },
    update: {},
  });
  for (let i = 0; i < 2; i++) {
    const s = await createEvent(
      {
        ...extractDemo("Wedding in Delhi February 2027 250 guests ₹12 lakh")
          .event,
        name: `Management integration ${i}`,
      },
      "demo-user",
    );
    ids.push(s.id);
    if (!i) state = s;
    else other = s;
  }
});
afterAll(async () => {
  await db.event.deleteMany({
    where: { id: { in: ids }, userId: "demo-user" },
  });
  await db.$disconnect();
});
describe("Guest, expense and approval workflows", () => {
  it("persists RSVP parties without silently changing planning headcount", async () => {
    const created = await request(path("/guests"), "POST", guest);
    expect(created.status).toBe(201);
    const g = await created.json();
    const rows = await (await request(path("/guests"))).json();
    expect(guestSummary(rows)).toEqual({
      invited: 3,
      confirmed: 3,
      pending: 0,
      declined: 0,
    });
    expect((await get_event_state(state.id, "demo-user")).guestCount).toBe(250);
    expect(
      (
        await request(path(`/guests/${g.id}`), "PATCH", {
          ...guest,
          rsvp: "Declined",
        })
      ).status,
    ).toBe(200);
    expect(
      (await request(`events/${other.id}/guests/${g.id}`, "DELETE")).status,
    ).toBe(404);
    await expect(guests(state.id, "another-user")).rejects.toThrow(
      "Event not found",
    );
    expect(
      (await request(path("/guests"), "POST", { ...guest, plusOnes: -1 }))
        .status,
    ).toBe(400);
    expect((await request(path(`/guests/${g.id}`), "DELETE")).status).toBe(204);
  });
  it("separates quotes from commitments, records deposits and prevents overpayment", async () => {
    const created = await request(path("/expenses"), "POST", expense);
    expect(created.status).toBe(201);
    const e = await created.json();
    const paymentPath = path(`/expenses/${e.id}/payments`);
    const payment = {
      amount: 3000,
      paidOn: "2026-10-01",
      reference: "Deposit",
    };
    expect((await request(paymentPath, "POST", payment)).status).toBe(409);
    expect(
      (
        await request(path(`/expenses/${e.id}`), "PATCH", {
          ...expense,
          status: "Confirmed",
        })
      ).status,
    ).toBe(200);
    const deposit = await request(paymentPath, "POST", payment);
    expect(deposit.status).toBe(201);
    const p = await deposit.json();
    const rows = await (await request(path("/expenses"))).json();
    expect(expenseSummary(rows)).toEqual({
      quoted: 0,
      committed: 10000,
      paid: 3000,
      outstanding: 7000,
    });
    expect(
      (await request(paymentPath, "POST", { ...payment, amount: 7001 })).status,
    ).toBe(409);
    expect(
      (await request(paymentPath, "POST", { ...payment, paidOn: "2099-01-01" }))
        .status,
    ).toBe(400);
    expect(
      (
        await request(path(`/expenses/${e.id}`), "PATCH", {
          ...expense,
          status: "Confirmed",
          amount: 2999,
        })
      ).status,
    ).toBe(409);
    expect(
      (await request(path(`/expenses/${e.id}`), "PATCH", expense)).status,
    ).toBe(409);
    expect((await request(path(), "PATCH", { currency: "USD" })).status).toBe(
      409,
    );
    expect(
      (
        await request(
          `events/${other.id}/expenses/${e.id}/payments/${p.id}`,
          "DELETE",
        )
      ).status,
    ).toBe(404);
    await expect(expenses(state.id, "another-user")).rejects.toThrow(
      "Event not found",
    );
    expect((await request(`${paymentPath}/${p.id}`, "DELETE")).status).toBe(
      204,
    );
    expect((await request(path(`/expenses/${e.id}`), "DELETE")).status).toBe(
      204,
    );
  });
  it("serializes simultaneous payments so their sum cannot exceed the commitment", async () => {
    const e = await (
      await request(path("/expenses"), "POST", {
        ...expense,
        status: "Confirmed",
      })
    ).json();
    const responses = await Promise.all(
      [1, 2].map((i) =>
        request(path(`/expenses/${e.id}/payments`), "POST", {
          amount: 7000,
          paidOn: "2026-10-01",
          reference: `Concurrent ${i}`,
        }),
      ),
    );
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    const rows = await (await request(path("/expenses"))).json();
    expect(expenseSummary(rows).paid).toBe(7000);
  });
  it("stages readable diffs without mutation, then applies and undoes while retaining records", async () => {
    const before = await get_event_state(state.id, "demo-user");
    const preview = await propose();
    expect(preview.state.budget).toBe(before.budget);
    expect(preview.state.version).toBe(before.version);
    expect(preview.proposal.differences).toContainEqual(
      expect.objectContaining({
        label: "Total budget",
        before: "₹12,00,000",
        after: "₹10,00,000",
      }),
    );
    expect(preview.proposal).not.toHaveProperty("before");
    const applied = await request(
      path(`/changes/${preview.proposal.id}/apply`),
      "POST",
      {},
    );
    expect(applied.status).toBe(200);
    expect((await applied.json()).budget).toBe(1000000);
    expect(
      (await request(path(`/changes/${preview.proposal.id}/apply`), "POST", {}))
        .status,
    ).toBe(409);
    const undone = await request(
      path(`/changes/${preview.proposal.id}/undo`),
      "POST",
      {},
    );
    expect(undone.status).toBe(200);
    expect(planDifferences(before, await undone.json())).toEqual([]);
    expect(
      expenseSummary(await (await request(path("/expenses"))).json()).paid,
    ).toBe(7000);
    const history = await (await request(path("/changes"))).json();
    expect(
      history.find((c: { id: string }) => c.id === preview.proposal.id).status,
    ).toBe("Undone");
  });
  it("discards proposals and rejects previews after intervening edits", async () => {
    const preview = await propose();
    expect(
      (
        await request(
          `events/${other.id}/changes/${preview.proposal.id}/apply`,
          "POST",
          {},
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await request(
          path(`/changes/${preview.proposal.id}/discard`),
          "POST",
          {},
        )
      ).status,
    ).toBe(200);
    expect(
      (await request(path(`/changes/${preview.proposal.id}/apply`), "POST", {}))
        .status,
    ).toBe(409);
    const stale = await propose();
    await request(path("/guests"), "POST", guest);
    expect(
      (await request(path(`/changes/${stale.proposal.id}/apply`), "POST", {}))
        .status,
    ).toBe(409);
    expect((await get_event_state(state.id, "demo-user")).budget).toBe(1200000);
  });
  it("allows read-only chat after apply but blocks undo after a newer edit", async () => {
    const preview = await propose();
    const applied = await request(
      path(`/changes/${preview.proposal.id}/apply`),
      "POST",
      {},
    );
    const next = await applied.json();
    const answer = await propose("What are my next tasks?");
    expect(answer.proposal).toBeNull();
    expect(answer.state.version).toBe(next.version);
    const g = await request(path("/guests"), "POST", {
      ...guest,
      name: "Later Guest",
    });
    expect(g.status).toBe(201);
    expect(
      (await request(path(`/changes/${preview.proposal.id}/undo`), "POST", {}))
        .status,
    ).toBe(409);
    expect((await get_event_state(state.id, "demo-user")).budget).toBe(1000000);
  });
});
