import { AppError } from "../auth";

export const MAX_AGENT_ROUNDS = 6;
export const MAX_AI_OUTPUT_TOKENS = 4096;
export const AI_DEADLINE_MS = 90_000;

/** One deadline covers all tool rounds; cancellation also reaches the SDK. */
export async function withAIExecution<T>(
  parent: AbortSignal | undefined,
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs = AI_DEADLINE_MS,
): Promise<T> {
  const controller = new AbortController();
  const cancelled = () =>
    controller.abort(
      new AppError(
        408,
        "The request was cancelled. Your saved plan has not changed.",
      ),
    );
  if (parent?.aborted) cancelled();
  else parent?.addEventListener("abort", cancelled, { once: true });
  const timer = setTimeout(
    () =>
      controller.abort(
        new AppError(
          504,
          "The planner took too long. Your saved plan has not changed. Please try a shorter request.",
        ),
      ),
    timeoutMs,
  );
  let onAbort: () => void = () => {};
  try {
    controller.signal.throwIfAborted();
    const aborted = new Promise<never>((_, reject) => {
      onAbort = () => reject(controller.signal.reason);
      controller.signal.addEventListener("abort", onAbort, { once: true });
    });
    const result = await Promise.race([operation(controller.signal), aborted]);
    controller.signal.throwIfAborted();
    return result;
  } catch (error) {
    if (controller.signal.aborted) throw controller.signal.reason;
    throw error;
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener("abort", cancelled);
    controller.signal.removeEventListener("abort", onAbort);
  }
}
