// @vitest-environment jsdom
import { createElement } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Workspace from "../components/workspace";
import CreateEvent from "../components/create-event";
import { create_event_plan } from "../lib/engines";
import type { EventInput } from "../lib/validation";
import type { PlanChange } from "../lib/management";
const mocks = vi.hoisted(() => ({ api: vi.fn(), push: vi.fn() }));
vi.mock("../components/api", () => ({ api: mocks.api }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
    createElement("div", {}, children),
  PieChart: () =>
    createElement("div", { "aria-label": "Budget allocation chart" }),
  Pie: () => null,
  Cell: () => null,
  Tooltip: () => null,
}));
const input: EventInput = {
  name: "Test celebration",
  eventType: "Wedding",
  date: "2027-02-14",
  location: "Delhi",
  guestCount: 250,
  budget: 1200000,
  currency: "INR",
  theme: "Modern",
  priorities: ["Photography"],
  preferences: [],
  sustainable: false,
  venueCapacity: null,
};
let state = create_event_plan(input, "frontend");
let changes: PlanChange[] = [];
beforeEach(() => {
  mocks.api.mockReset();
  mocks.push.mockReset();
  localStorage.clear();
  state = create_event_plan(input, "frontend");
  changes = [];
  HTMLElement.prototype.scrollIntoView = vi.fn();
  mocks.api.mockImplementation(
    async (path: string, method: string, body: Record<string, unknown>) => {
      if (path === "events" && method === "POST") return state;
      if (path === "events")
        return {
          events: [
            {
              id: state.id,
              name: state.name,
              date: state.date,
              eventType: state.eventType,
            },
          ],
          mode: "demo",
        };
      if (path === "extract")
        return { event: input, assumptions: ["Exact date is a placeholder."] };
      if (path.endsWith("/changes")) return changes;
      if (path.endsWith("/apply")) {
        state = { ...state, budget: 1000000, version: state.version + 1 };
        changes = changes.map((c) => ({
          ...c,
          status: "Applied",
          appliedVersion: state.version,
        }));
        return state;
      }
      if (path.endsWith("/chat")) {
        state = {
          ...state,
          messages: [
            { role: "user", content: String(body.message) },
            { role: "assistant", content: "Budget changes ready for review." },
          ],
        };
        changes = [
          {
            id: "preview",
            status: "Pending",
            baseVersion: state.version,
            appliedVersion: null,
            request: String(body.message),
            explanation: "Reduce the budget",
            createdAt: new Date().toISOString(),
            differences: [
              {
                section: "Event",
                label: "Total budget",
                before: "₹12,00,000",
                after: "₹10,00,000",
              },
            ],
          },
        ];
        return { state, mode: "demo" };
      }
      if (path.startsWith("tasks/")) {
        state = {
          ...state,
          tasks: state.tasks.map((t) =>
            t.id === path.slice(6) ? { ...t, status: "Completed" as const } : t,
          ),
        };
        return state;
      }
      return state;
    },
  );
});
afterEach(() => {
  cleanup();
});
describe("Frontend state and interactions", () => {
  it("renders the backend event dashboard", async () => {
    render(createElement(Workspace, { section: "dashboard" }));
    expect(
      await screen.findByRole("heading", { name: "Test celebration" }),
    ).toBeTruthy();
    expect(screen.getByText("₹12,00,000")).toBeTruthy();
    expect(screen.getByText("0 of 10 tasks completed")).toBeTruthy();
  });
  it("renders allocations and estimates on the budget page", async () => {
    render(createElement(Workspace, { section: "budget" }));
    expect(await screen.findByRole("table")).toBeTruthy();
    expect(
      screen.getByRole("columnheader", { name: "Estimated" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "AI rebalance" })).toBeTruthy();
  });
  it("renders timeline milestones from persisted state", async () => {
    render(createElement(Workspace, { section: "timeline" }));
    expect(
      await screen.findByRole("heading", {
        name: "Confirm venue capacity for 250 guests",
      }),
    ).toBeTruthy();
    expect(
      screen.getAllByText(/After: Confirm venue capacity/).length,
    ).toBeGreaterThan(0);
  });
  it("sends task completion and refreshes the returned task", async () => {
    render(createElement(Workspace, { section: "tasks" }));
    const complete = await screen.findByRole("button", {
      name: "Complete Confirm venue capacity for 250 guests",
    });
    await userEvent.click(complete);
    expect(
      await screen.findByRole("button", {
        name: "Reopen Confirm venue capacity for 250 guests",
      }),
    ).toBeTruthy();
    expect(mocks.api).toHaveBeenCalledWith(
      `tasks/${state.tasks[0].id}`,
      "PATCH",
      { status: "Completed" },
    );
  });
  it("previews chat changes and updates the budget only after apply", async () => {
    render(createElement(Workspace, { section: "planner" }));
    await screen.findByRole("heading", { name: "Your event brief" });
    await userEvent.type(
      screen.getByLabelText("Message your event planner"),
      "Reduce my budget to ₹10 lakh.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(
      await screen.findByText("Budget changes ready for review."),
    ).toBeTruthy();
    const apply = await screen.findByRole("button", { name: "Apply changes" });
    expect(state.budget).toBe(1200000);
    await userEvent.click(apply);
    await waitFor(() => expect(state.budget).toBe(1000000));
    expect(await screen.findByText("₹10,00,000")).toBeTruthy();
  });
  it("reviews extraction before creating and opening the event", async () => {
    render(createElement(CreateEvent));
    await userEvent.type(
      screen.getByLabelText("Tell us a little about your plans"),
      "Wedding in Delhi, 250 guests, ₹12 lakh in February 2027.",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Build my event brief" }),
    );
    expect(
      await screen.findByText("Exact date is a placeholder."),
    ).toBeTruthy();
    expect(mocks.api).not.toHaveBeenCalledWith(
      "events",
      "POST",
      expect.anything(),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Create event & plan" }),
    );
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/dashboard"));
    expect(localStorage.getItem("eventiq-event")).toBe("frontend");
  });
});
