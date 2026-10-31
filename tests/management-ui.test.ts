// @vitest-environment jsdom
import { createElement } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Guests from "../components/guests";
import Expenses from "../components/expenses";
import ChangeReview from "../components/change-review";
import { create_event_plan } from "../lib/engines";
import { extractDemo } from "../lib/agent/extract";
const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("../components/api", () => ({ api: mocks.api }));
const state = create_event_plan(
  extractDemo("Wedding in Delhi February 2027 250 guests ₹12 lakh").event,
  "ui",
);
beforeEach(() => {
  mocks.api.mockReset();
});
afterEach(cleanup);
describe("Management screens", () => {
  it("saves guest details and plus-ones without implicitly changing the plan", async () => {
    let rows: unknown[] = [];
    mocks.api.mockImplementation(
      async (path: string, method?: string, body?: unknown) => {
        if (method === "POST") {
          rows = [{ id: "guest", ...(body as object) }];
          return rows[0];
        }
        return path.endsWith("/guests") ? rows : state;
      },
    );
    render(createElement(Guests, { state, onState: vi.fn() }));
    await screen.findByText(
      "Your guest list starts here. Add your first guest.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Add guest" }));
    await userEvent.type(screen.getByLabelText("Guest name"), "Asha Patel");
    await userEvent.selectOptions(screen.getByLabelText("RSVP"), "Accepted");
    await userEvent.clear(screen.getByLabelText("Plus-ones"));
    await userEvent.type(screen.getByLabelText("Plus-ones"), "2");
    await userEvent.click(screen.getByRole("button", { name: "Save guest" }));
    expect(await screen.findByText("Asha Patel")).toBeTruthy();
    expect(mocks.api).toHaveBeenCalledWith(
      "events/ui/guests",
      "POST",
      expect.objectContaining({
        name: "Asha Patel",
        plusOnes: 2,
        rsvp: "Accepted",
      }),
    );
    expect(mocks.api).not.toHaveBeenCalledWith(
      "events/ui",
      "PATCH",
      expect.anything(),
    );
    expect(
      (
        screen.getByRole("button", {
          name: /Use confirmed count/,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });
  it("reports a rejected overpayment without closing the payment form", async () => {
    const row = {
      id: "expense",
      title: "Venue agreement",
      category: "Venue",
      supplier: "Test",
      status: "Confirmed",
      amount: 10000,
      dueDate: null,
      notes: "",
      payments: [],
    };
    mocks.api.mockImplementation(async (path: string, method?: string) => {
      if (method === "POST")
        throw new Error("This payment exceeds the outstanding balance.");
      return path.endsWith("/expenses") ? [row] : state;
    });
    render(createElement(Expenses, { state, onState: vi.fn() }));
    await screen.findByText("Venue agreement");
    await userEvent.click(
      screen.getByRole("button", { name: "Record payment" }),
    );
    const amount = screen.getByLabelText("Payment amount (INR)");
    await userEvent.clear(amount);
    await userEvent.type(amount, "10001");
    await userEvent.click(
      screen.getByRole("button", { name: "Save payment record" }),
    );
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "This payment exceeds the outstanding balance.",
    );
    expect(mocks.api).toHaveBeenCalledWith(
      "events/ui/expenses/expense/payments",
      "POST",
      expect.objectContaining({ amount: 10001 }),
    );
  });
  it("disables stale approval while allowing the proposal to be discarded", async () => {
    let pending = true;
    mocks.api.mockImplementation(async (_path: string, method?: string) => {
      if (method === "POST") {
        pending = false;
        return state;
      }
      return pending
        ? [
            {
              id: "change",
              status: "Pending",
              baseVersion: state.version - 1,
              appliedVersion: null,
              request: "Adjust budget",
              explanation: "Draft only",
              differences: [
                {
                  section: "Event",
                  label: "Budget",
                  before: "1200000",
                  after: "1000000",
                },
              ],
              createdAt: new Date().toISOString(),
            },
          ]
        : [];
    });
    render(createElement(ChangeReview, { state, onState: vi.fn() }));
    const apply = await screen.findByRole("button", { name: "Apply changes" });
    expect((apply as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Discard" }));
    await waitFor(() => expect(screen.queryByText("Adjust budget")).toBeNull());
    expect(mocks.api).toHaveBeenCalledWith(
      "events/ui/changes/change/discard",
      "POST",
      {},
    );
  });
});
