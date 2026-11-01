// @vitest-environment jsdom
import { createElement } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import Workspace from "../components/workspace";
import CreateEvent from "../components/create-event";
import { create_event_plan } from "../lib/engines";
import type { EventInput } from "../lib/validation";
import type { PlanChange } from "../lib/management";
const mocks = vi.hoisted(() => ({ api: vi.fn(), push: vi.fn() }));
vi.mock("../components/api", () => ({ api: mocks.api }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
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
  it.each([
    "dashboard",
    "planner",
    "budget",
    "timeline",
    "tasks",
    "vendors",
    "ideas",
    "risks",
  ])(
    "has no automated semantic accessibility violations on %s",
    async (section) => {
      const { container } = render(createElement(Workspace, { section }));
      const ready = {
        dashboard: () =>
          screen.findByRole("heading", { name: "Test celebration" }),
        planner: () =>
          screen.findByRole("heading", { name: "Your event brief" }),
        budget: () => screen.findByRole("table"),
        timeline: () =>
          screen.findByRole("heading", {
            name: "Confirm venue capacity for 250 guests",
          }),
        tasks: () => screen.findByRole("button", { name: "Add task" }),
        vendors: () => screen.findByText("Your service checklist"),
        ideas: () => screen.findByRole("button", { name: "All ideas" }),
        risks: () =>
          screen.findByRole("heading", { name: state.risks[0].title }),
      };
      await ready[section as keyof typeof ready]();
      // JSDOM has no layout engine; contrast needs a real-browser review.
      const results = await axe.run(container, {
        rules: { "color-contrast": { enabled: false } },
      });
      expect(
        results.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
    },
  );
  it("opens keyboard navigation, wraps focus and returns focus on Escape", async () => {
    const user = userEvent.setup();
    render(createElement(Workspace, { section: "dashboard" }));
    await screen.findByRole("heading", { name: "Test celebration" });
    const trigger = screen.getByRole("button", { name: "Open navigation" });
    await user.click(trigger);
    const close = screen.getByRole("button", { name: "Close navigation" });
    expect(document.activeElement).toBe(close);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    await user.tab({ shift: true });
    expect(
      screen
        .getByLabelText("Workspace navigation")
        .contains(document.activeElement),
    ).toBe(true);
    await user.keyboard("{Escape}");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });
  it("keeps task-editor focus inside the dialog and restores the trigger", async () => {
    const user = userEvent.setup();
    render(createElement(Workspace, { section: "tasks" }));
    const trigger = await screen.findByRole("button", { name: "Add task" });
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.querySelector<HTMLElement>(".main-shell")?.inert).toBe(
      true,
    );
    expect(document.body.style.overflow).toBe("hidden");
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Save task" }),
    );
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(document.querySelector<HTMLElement>(".main-shell")?.inert).not.toBe(
      true,
    );
    expect(document.body.style.overflow).not.toBe("hidden");
  });
  it.each(["Birthday", "Wedding"])(
    "loads a reviewable %s example without creating records",
    async (type) => {
      render(createElement(CreateEvent));
      await userEvent.click(
        screen.getByRole("button", { name: `${type} example` }),
      );
      expect(
        (screen.getByLabelText("Event type") as HTMLSelectElement).value,
      ).toBe(type);
      expect(screen.getByText(/This is sample data/)).toBeTruthy();
      expect(mocks.api).not.toHaveBeenCalled();
    },
  );
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
      { signal: expect.any(AbortSignal) },
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
