import { describe, it, expect, vi, beforeEach } from "vitest";
import { create_event_plan, categoryNames } from "../lib/engines";
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
  it("bounds repeated tool calls and leaves the original plan unchanged", async () => {
    mock.create.mockResolvedValue({
      output: [
        {
          type: "function_call",
          name: "get_event_state",
          call_id: "repeat",
          arguments: "{}",
        },
      ],
    });
    const initial = create_event_plan(input, "limit");
    const saved = structuredClone(initial);
    await expect(runAgent(initial, "Keep planning")).rejects.toThrow(
      "action limit",
    );
    expect(mock.create).toHaveBeenCalledTimes(6);
    expect(initial).toEqual(saved);
  });
  it.each([
    ["unknown tool", "delete_event", "{}"],
    ["malformed arguments", "update_event_state", "{"],
    [
      "duplicate category weights",
      "create_event_plan",
      JSON.stringify({
        weights: categoryNames.map(() => ({ category: "Venue", weight: 1 })),
        ideas: [],
      }),
    ],
    [
      "oversized personalized idea",
      "create_event_plan",
      JSON.stringify({
        weights: categoryNames.map((category) => ({ category, weight: 1 })),
        ideas: [
          {
            category: "Food",
            idea: "x".repeat(6001),
            reason: "Seasonal",
            impact: "Low waste",
            estimatedCost: 0,
            priority: "High",
          },
        ],
      }),
    ],
  ])("rejects %s without modifying state", async (_name, name, args) => {
    mock.create.mockResolvedValue({
      output: [
        { type: "function_call", name, call_id: "invalid", arguments: args },
      ],
    });
    const initial = create_event_plan(input, "invalid-tool");
    const saved = structuredClone(initial);
    await expect(runAgent(initial, "Plan")).rejects.toThrow();
    expect(initial).toEqual(saved);
  });
  it("discards a valid draft if a later model request fails", async () => {
    mock.create
      .mockResolvedValueOnce({
        output: [
          {
            type: "function_call",
            name: "update_event_state",
            call_id: "draft",
            arguments: JSON.stringify({
              budget: 1000000,
              guestCount: null,
              date: null,
              sustainable: null,
              location: null,
              theme: null,
              photographyAllocation: null,
            }),
          },
        ],
      })
      .mockRejectedValueOnce(new Error("Connection lost"));
    const initial = create_event_plan(input, "late-failure");
    const saved = structuredClone(initial);
    await expect(runAgent(initial, "Reduce budget")).rejects.toThrow(
      "Connection lost",
    );
    expect(initial).toEqual(saved);
  });
  it("does not resend conversation history inside tool results", async () => {
    mock.create
      .mockResolvedValueOnce({
        output: [
          {
            type: "function_call",
            name: "get_event_state",
            call_id: "read",
            arguments: "{}",
          },
        ],
      })
      .mockResolvedValueOnce({ output: [], output_text: "Plan reviewed." });
    const initial = create_event_plan(input, "context");
    initial.messages = Array.from({ length: 20 }, (_, i) => ({
      role: "user",
      content: `Message ${i}`,
    }));
    await runAgent(initial, "Review plan");
    const sent = mock.create.mock.calls[1][0];
    const output = sent.input.find(
      (item: { type?: string }) => item.type === "function_call_output",
    );
    expect(JSON.parse(output.output).messages).toEqual([]);
    expect(
      sent.input.filter((item: { role?: string }) => item.role === "user"),
    ).toHaveLength(13);
    expect(sent.store).toBe(false);
    expect(sent.parallel_tool_calls).toBe(false);
  });
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

describe("Cancelled and incomplete model responses", () => {
  it("does not call the provider for an already cancelled request", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      runAgent(
        create_event_plan(input, "cancelled"),
        "Help",
        controller.signal,
      ),
    ).rejects.toMatchObject({ status: 408 });
    expect(mock.create).not.toHaveBeenCalled();
  });
  it("never runs another tool round after cancellation", async () => {
    const controller = new AbortController();
    mock.create.mockImplementation(async (_body, options) => {
      expect(options.signal).toBeInstanceOf(AbortSignal);
      expect(options.maxRetries).toBe(0);
      controller.abort();
      return {
        output: [
          {
            type: "function_call",
            name: "get_event_state",
            call_id: "cancelled",
            arguments: "{}",
          },
        ],
      };
    });
    const initial = create_event_plan(input, "cancel-round");
    const before = structuredClone(initial);
    await expect(
      runAgent(initial, "Help", controller.signal),
    ).rejects.toMatchObject({ status: 408 });
    expect(mock.create).toHaveBeenCalledTimes(1);
    expect(initial).toEqual(before);
  });
  it("rejects truncated model output instead of staging a partial proposal", async () => {
    mock.create.mockResolvedValue({
      status: "incomplete",
      output: [],
      output_text: "Partial",
    });
    await expect(
      runAgent(create_event_plan(input, "truncated"), "Help"),
    ).rejects.toThrow("incomplete");
    expect(mock.create.mock.calls[0][0].max_output_tokens).toBe(4096);
  });
});
