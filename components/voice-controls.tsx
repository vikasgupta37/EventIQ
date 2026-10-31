"use client";
import { browserStorageEnabled } from "@/lib/storage-mode";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Volume2, VolumeX, X } from "lucide-react";
import { MAX_AUDIO_BYTES } from "@/lib/voice-limits";

type Props = {
  eventId: string;
  disabled: boolean;
  onTranscript: (text: string) => void;
  onBusyChange: (busy: boolean) => void;
  speechRequest: { id: number; text: string } | null;
  latestReply: string;
};
type Phase = "idle" | "permission" | "recording" | "transcribing";
export default function VoiceControls({
  eventId,
  disabled,
  onTranscript,
  onBusyChange,
  speechRequest,
  latestReply,
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [spoken, setSpoken] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [language, setLanguage] = useState("en-IN");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const seenReply = useRef<number | null>(null);
  const callbacks = useRef({ onTranscript, onBusyChange });
  useEffect(() => {
    callbacks.current = { onTranscript, onBusyChange };
  }, [onTranscript, onBusyChange]);
  const release = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);
  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window)
      window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);
  const cancel = useCallback(() => {
    generation.current++;
    controller.current?.abort();
    if (recorder.current?.state === "recording") recorder.current.stop();
    recorder.current = null;
    release();
    setPhase("idle");
    callbacks.current.onBusyChange(false);
  }, [release]);
  useEffect(
    () => () => {
      generation.current++;
      controller.current?.abort();
      if (recorder.current?.state === "recording") recorder.current.stop();
      release();
      callbacks.current.onBusyChange(false);
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    [release, eventId],
  );
  const speak = useCallback(
    (text: string) => {
      if (
        !("speechSynthesis" in window) ||
        !("SpeechSynthesisUtterance" in window)
      ) {
        setError(
          "Spoken replies are unavailable in this browser. Your answer is still shown in the chat.",
        );
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = 1;
      const voices = window.speechSynthesis.getVoices();
      utterance.voice =
        voices.find((v) => v.lang === language) ??
        voices.find((v) => v.lang.startsWith(language.slice(0, 2))) ??
        null;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = (event) => {
        setSpeaking(false);
        if (!["canceled", "interrupted"].includes(event.error))
          setError(
            "Audio playback was unavailable. Use “Read latest reply” to try again.",
          );
      };
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    },
    [language],
  );
  useEffect(() => {
    if (!speechRequest || seenReply.current === speechRequest.id) return;
    seenReply.current = speechRequest.id;
    if (spoken) {
      const playback = setTimeout(() => speak(speechRequest.text), 0);
      return () => clearTimeout(playback);
    }
  }, [speechRequest, spoken, speak]);
  async function start() {
    if (disabled || phase !== "idle") return;
    setError("");
    setHint("");
    stopSpeaking();
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError(
        "Microphone recording is unavailable. Open EventIQ in Chrome, Edge or Safari on HTTPS or localhost, or type your message.",
      );
      return;
    }
    const current = ++generation.current;
    setPhase("permission");
    callbacks.current.onBusyChange(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      if (current !== generation.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(
        (t) => MediaRecorder.isTypeSupported(t),
      );
      const recording = new MediaRecorder(
        media,
        mime ? { mimeType: mime } : undefined,
      );
      recorder.current = recording;
      const chunks: Blob[] = [];
      let bytes = 0;
      recording.ondataavailable = (e) => {
        if (e.data.size) {
          bytes += e.data.size;
          chunks.push(e.data);
          if (bytes > MAX_AUDIO_BYTES) {
            cancel();
            setError(
              "Recording is too large. Please record a shorter message.",
            );
          }
        }
      };
      recording.onerror = () => {
        cancel();
        setError("Microphone recording failed. Please try again.");
      };
      recording.onstop = async () => {
        release();
        if (current !== generation.current) return;
        recorder.current = null;
        const blob = new Blob(chunks, {
          type: recording.mimeType || "audio/webm",
        });
        if (!blob.size) {
          setPhase("idle");
          callbacks.current.onBusyChange(false);
          setError("No audio was captured. Please try again.");
          return;
        }
        setPhase("transcribing");
        controller.current = new AbortController();
        try {
          const form = new FormData();
          form.append(
            "audio",
            blob,
            blob.type.includes("mp4") ? "recording.mp4" : "recording.webm",
          );
          const response = await fetch(
            browserStorageEnabled()
              ? "/api/demo/transcribe"
              : `/api/events/${eventId}/transcribe`,
            {
              method: "POST",
              body: form,
              signal: controller.current.signal,
            },
          );
          const data = await response.json();
          if (!response.ok)
            throw new Error(
              data.error || "Could not transcribe your recording.",
            );
          if (typeof data.text !== "string" || !data.text.trim())
            throw new Error("No speech was detected. Please try again.");
          if (current !== generation.current) return;
          callbacks.current.onTranscript(data.text);
          setHint(
            "Transcript added below. Review it, then press Send to update your plan.",
          );
        } catch (e) {
          if (current === generation.current)
            setError(
              (e as Error).message || "Voice input failed. You can still type.",
            );
        } finally {
          if (current === generation.current) {
            setPhase("idle");
            callbacks.current.onBusyChange(false);
          }
        }
      };
      recording.start(250);
      setSeconds(0);
      setPhase("recording");
      const started = Date.now();
      timer.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - started) / 1000);
        setSeconds(elapsed);
        if (elapsed >= 60 && recording.state === "recording") recording.stop();
      }, 250);
    } catch (e) {
      if (current !== generation.current) return;
      release();
      setPhase("idle");
      callbacks.current.onBusyChange(false);
      const name = (e as Error).name;
      setError(
        name === "NotAllowedError"
          ? "Microphone access was denied. Allow it in your browser’s site permissions, then try again."
          : name === "NotFoundError"
            ? "No microphone was found. Connect one or type your message."
            : "Could not start the microphone. Check your device and try again.",
      );
    }
  }
  return (
    <div className="voice-panel">
      <div className="voice-toolbar">
        <button
          type="button"
          className={`voice-record ${phase === "recording" ? "recording" : ""}`}
          disabled={
            disabled || phase === "permission" || phase === "transcribing"
          }
          onClick={() =>
            phase === "recording" ? recorder.current?.stop() : void start()
          }
          aria-label={
            phase === "recording" ? "Stop recording" : "Start voice input"
          }
        >
          {phase === "recording" ? <Square size={15} /> : <Mic size={16} />}{" "}
          {phase === "recording"
            ? `Stop · ${seconds}s`
            : phase === "permission"
              ? "Allow microphone…"
              : phase === "transcribing"
                ? "Transcribing…"
                : "Speak your request"}
        </button>
        {phase !== "idle" && (
          <button
            type="button"
            className="icon-button"
            aria-label="Cancel voice input"
            onClick={cancel}
          >
            <X size={16} />
          </button>
        )}
        <label className="voice-toggle">
          <input
            type="checkbox"
            checked={spoken}
            onChange={(e) => {
              setSpoken(e.target.checked);
              if (!e.target.checked) stopSpeaking();
            }}
          />{" "}
          Spoken replies
        </label>
        <select
          aria-label="Spoken reply language"
          value={language}
          onChange={(e) => {
            stopSpeaking();
            setLanguage(e.target.value);
          }}
        >
          <option value="en-IN">English</option>
          <option value="hi-IN">Hindi</option>
        </select>
        <button
          type="button"
          className="icon-button"
          disabled={!latestReply || phase !== "idle" || disabled}
          aria-label={speaking ? "Stop spoken reply" : "Read latest reply"}
          onClick={() => (speaking ? stopSpeaking() : speak(latestReply))}
        >
          {speaking ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>
      </div>
      <p className="voice-privacy">
        Record up to 60 seconds. Audio is sent to OpenAI for transcription;
        review before sending. Replies use a synthetic device voice.
      </p>
      {phase === "recording" && (
        <p className="voice-status" role="status">
          <span className="recording-dot" /> Listening — your microphone is on.
        </p>
      )}
      {phase === "transcribing" && (
        <p className="voice-status" role="status">
          Transcribing your recording…
        </p>
      )}
      {hint && (
        <p className="voice-status" role="status">
          {hint}
        </p>
      )}
      {error && (
        <p className="voice-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
