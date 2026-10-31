import { describe, it, expect, vi, beforeEach } from "vitest";
import { create_event_plan } from "../lib/engines";
const mock = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("../lib/agent/extract", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../lib/agent/extract")>();
  return {
    ...original,
    hasAI: () => true,
    aiClient: () => ({ responses: { create: mock.create } }),
  };
});
import { runAgent } from "../lib/agent/orchestrator";
import { extractDemo } from "../lib/agent/extract";
const input = extractDemo(
  "Wedding in Delhi February 2027 250 guests ₹12 lakh",
).event;
beforeEach(() => {
  mock.create.mockReset();
});
describe("OpenAI tool orchestration with mocked transport", () => {
  it("executes a model-selected update and supplies the result before final text", async () => {
    mock.create
      .mockResolvedValueOnce({
        output: [
          {
            type: "function_call",
            name: "update_event_state",
            call_id: "call_1",
            arguments: JSON.stringify({
              budget: 1000000,
              guestCount: 350,
              date: null,
              sustainable: true,
              location: null,
              theme: null,
              photographyAllocation: null,
            }),
          },
        ],
      })
      .mockResolvedValueOnce({ output: [], output_text: "Updated your plan." });
    const initial = create_event_plan(input, "ai-test");
    const result = await runAgent(
      initial,
      "Reduce my budget and increase guests.",
    );
    expect(result.state).toMatchObject({
      budget: 1000000,
      guestCount: 350,
      sustainable: true,
    });
    expect(initial.budget).toBe(1200000);
    expect(result.actions.length).toBeGreaterThan(0);
    expect(
      mock.create.mock.calls[1][0].input.some(
        (i: { type?: string }) => i.type === "function_call_output",
      ),
    ).toBe(true);
  });
  it("rejects invalid model arguments without modifying the supplied state", async () => {
    mock.create.mockResolvedValue({
      output: [
        {
          type: "function_call",
          name: "update_event_state",
          call_id: "bad",
          arguments: JSON.stringify({ budget: -10 }),
        },
      ],
    });
    const initial = create_event_plan(input, "bad-test");
    await expect(runAgent(initial, "Change budget")).rejects.toThrow();
    expect(initial.budget).toBe(1200000);
  });
  it("surfaces model connection failure without persisting a partial action", async () => {
    mock.create.mockRejectedValue(new Error("AI unavailable"));
    await expect(
      runAgent(create_event_plan(input, "error-test"), "Plan"),
    ).rejects.toThrow("AI unavailable");
  });
});
