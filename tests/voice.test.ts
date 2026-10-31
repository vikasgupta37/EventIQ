import { beforeEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ create: vi.fn(), available: true }));
vi.mock("../lib/agent/extract", () => ({
  hasAI: () => mocks.available,
  aiClient: () => ({ audio: { transcriptions: { create: mocks.create } } }),
}));
import {
  readAudioUpload,
  transcribeAudio,
  MAX_AUDIO_BYTES,
} from "../lib/voice";
beforeEach(() => {
  mocks.create.mockReset();
  mocks.available = true;
});
function upload(file: File) {
  const form = new FormData();
  form.append("audio", file);
  return new Request("http://localhost/api/events/test/transcribe", {
    method: "POST",
    body: form,
  });
}
describe("Voice input validation and transcription", () => {
  it("normalizes browser audio uploads", async () => {
    const file = await readAudioUpload(
      upload(
        new File(["audio"], "untrusted-name", {
          type: "audio/webm;codecs=opus",
        }),
      ),
    );
    expect(file.name).toBe("recording.webm");
    expect(file.type).toBe("audio/webm");
  });
  it("rejects unsupported and empty files", async () => {
    await expect(
      readAudioUpload(
        upload(new File(["text"], "test.txt", { type: "text/plain" })),
      ),
    ).rejects.toThrow("not supported");
    await expect(
      readAudioUpload(
        upload(new File([], "empty.webm", { type: "audio/webm" })),
      ),
    ).rejects.toThrow("Record some speech");
  });
  it("rejects oversized streaming uploads without relying on content length", async () => {
    const cancelled = vi.fn();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_AUDIO_BYTES + 65537));
      },
      cancel: cancelled,
    });
    const request = new Request("http://localhost/transcribe", {
      method: "POST",
      body,
      headers: { "content-type": "multipart/form-data; boundary=test" },
      duplex: "half",
    } as RequestInit & { duplex: string });
    await expect(readAudioUpload(request)).rejects.toThrow("too large");
    expect(cancelled).toHaveBeenCalled();
  });
  it("uses server-side transcription and returns text only", async () => {
    mocks.create.mockResolvedValue({ text: " Reduce my budget to ten lakh. " });
    const text = await transcribeAudio(
      new File(["audio"], "test.webm", { type: "audio/webm" }),
    );
    expect(text).toBe("Reduce my budget to ten lakh.");
    expect(mocks.create.mock.calls[0][0].model).toBe(
      process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-transcribe",
    );
  });
  it("handles silence, missing credentials and provider errors", async () => {
    mocks.create.mockResolvedValue({ text: " " });
    await expect(transcribeAudio(new File(["a"], "a.webm"))).rejects.toThrow(
      "No speech",
    );
    mocks.available = false;
    await expect(transcribeAudio(new File(["a"], "a.webm"))).rejects.toThrow(
      "API key",
    );
    mocks.available = true;
    mocks.create.mockRejectedValue(new Error("Unavailable"));
    await expect(transcribeAudio(new File(["a"], "a.webm"))).rejects.toThrow(
      "Unavailable",
    );
  });
});
