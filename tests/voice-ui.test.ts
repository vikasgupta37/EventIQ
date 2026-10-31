// @vitest-environment jsdom
import { createElement } from "react";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import VoiceControls from "../components/voice-controls";
const stopped = vi.fn();
const getUserMedia = vi.fn();
const transcribed = vi.fn();
const busy = vi.fn();
const speak = vi.fn();
const cancelSpeech = vi.fn();
class Recorder {
  static isTypeSupported() {
    return true;
  }
  state = "inactive";
  mimeType = "audio/webm";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({
      data: new Blob(["recording"], { type: "audio/webm" }),
    });
    this.onstop?.();
  }
}
class Utterance {
  constructor(public text: string) {}
  lang = "";
  rate = 1;
  voice = null;
  onend = null;
  onerror = null;
}
const props = () => ({
  eventId: "demo",
  disabled: false,
  onTranscript: transcribed,
  onBusyChange: busy,
  speechRequest: null,
  latestReply: "Your budget is updated.",
});
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
  getUserMedia.mockResolvedValue({ getTracks: () => [{ stop: stopped }] });
  vi.stubGlobal("MediaRecorder", Recorder);
  vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
  vi.stubGlobal("speechSynthesis", {
    speak,
    cancel: cancelSpeech,
    getVoices: () => [],
  });
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ text: "Increase guests to 350." }),
      }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("Voice controls", () => {
  it("records on demand, stops microphone and returns a reviewable transcript", async () => {
    render(createElement(VoiceControls, props()));
    expect(getUserMedia).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole("button", { name: "Start voice input" }),
    );
    await screen.findByRole("button", { name: "Stop recording" });
    await userEvent.click(
      screen.getByRole("button", { name: "Stop recording" }),
    );
    await waitFor(() =>
      expect(transcribed).toHaveBeenCalledWith("Increase guests to 350."),
    );
    expect(stopped).toHaveBeenCalled();
    expect(screen.getByText(/Review it, then press Send/)).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith(
      "/api/events/demo/transcribe",
      expect.objectContaining({ method: "POST" }),
    );
    expect(busy).toHaveBeenLastCalledWith(false);
  });
  it("cancels recording without uploading", async () => {
    render(createElement(VoiceControls, props()));
    await userEvent.click(
      screen.getByRole("button", { name: "Start voice input" }),
    );
    await screen.findByRole("button", { name: "Stop recording" });
    await userEvent.click(
      screen.getByRole("button", { name: "Cancel voice input" }),
    );
    expect(stopped).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(transcribed).not.toHaveBeenCalled();
  });
  it("explains denied permission and keeps text fallback available", async () => {
    getUserMedia.mockRejectedValue(
      new DOMException("Denied", "NotAllowedError"),
    );
    render(createElement(VoiceControls, props()));
    await userEvent.click(
      screen.getByRole("button", { name: "Start voice input" }),
    );
    expect((await screen.findByRole("alert")).textContent).toContain("denied");
    expect(busy).toHaveBeenLastCalledWith(false);
  });
  it("releases the microphone on unmount", async () => {
    const view = render(createElement(VoiceControls, props()));
    await userEvent.click(
      screen.getByRole("button", { name: "Start voice input" }),
    );
    await screen.findByRole("button", { name: "Stop recording" });
    view.unmount();
    expect(stopped).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("reads new replies only when enabled and supports stop", async () => {
    const p = props();
    const view = render(createElement(VoiceControls, p));
    expect(speak).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole("checkbox", { name: "Spoken replies" }),
    );
    view.rerender(
      createElement(VoiceControls, {
        ...p,
        speechRequest: { id: 1, text: "Your budget is updated." },
      }),
    );
    await waitFor(() => expect(speak).toHaveBeenCalledTimes(1));
    await userEvent.click(
      screen.getByRole("button", { name: "Stop spoken reply" }),
    );
    expect(cancelSpeech).toHaveBeenCalled();
  });
  it("handles missing recording support without requesting permission", async () => {
    vi.stubGlobal("MediaRecorder", undefined);
    render(createElement(VoiceControls, props()));
    await userEvent.click(
      screen.getByRole("button", { name: "Start voice input" }),
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "unavailable",
    );
    expect(getUserMedia).not.toHaveBeenCalled();
  });
});
