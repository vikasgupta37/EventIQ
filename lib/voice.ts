import { withAIExecution } from "./agent/execution";
import { AppError } from "./auth";
import { aiClient, hasAI } from "./agent/extract";

import { MAX_AUDIO_BYTES } from "./voice-limits";
export { MAX_AUDIO_BYTES } from "./voice-limits";
const formats: Record<string, string> = {
  "audio/webm": "webm",
  "video/webm": "webm",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
};

/** Bound the request while reading, even if Content-Length is absent or false. */
export async function readAudioUpload(request: Request): Promise<File> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.startsWith("multipart/form-data"))
    throw new AppError(
      415,
      "Upload a microphone recording as multipart form data.",
    );
  if (Number(request.headers.get("content-length")) > MAX_AUDIO_BYTES + 65536)
    throw new AppError(
      413,
      "Recording is too large. Please keep it under one minute.",
    );
  const reader = request.body?.getReader();
  if (!reader) throw new AppError(400, "A recording is required.");
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_AUDIO_BYTES + 65536) {
        await reader.cancel();
        throw new AppError(
          413,
          "Recording is too large. Please keep it under one minute.",
        );
      }
      chunks.push(new Uint8Array(value));
    }
  } finally {
    reader.releaseLock();
  }
  let form: FormData;
  try {
    form = await new Response(new Blob(chunks), {
      headers: { "content-type": type },
    }).formData();
  } catch {
    throw new AppError(
      400,
      "The recording upload is malformed. Please record again.",
    );
  }
  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size === 0)
    throw new AppError(400, "Record some speech before transcribing.");
  if (audio.size > MAX_AUDIO_BYTES)
    throw new AppError(413, "Recording exceeds the 4 MB limit.");
  const mime = audio.type.split(";")[0].toLowerCase();
  const extension = formats[mime];
  if (!extension)
    throw new AppError(
      415,
      "This recording format is not supported. Try Chrome, Edge or Safari.",
    );
  return new File([audio], `recording.${extension}`, { type: mime });
}

export function transcribeAudio(
  audio: File,
  signal?: AbortSignal,
): Promise<string> {
  return withAIExecution(signal, (signal) => transcribe(audio, signal), 45_000);
}
async function transcribe(audio: File, signal: AbortSignal): Promise<string> {
  if (!hasAI())
    throw new AppError(
      503,
      "Voice input needs an OpenAI API key. You can still type your message.",
    );
  const transcript = await aiClient().audio.transcriptions.create(
    {
      file: audio,
      model: process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-transcribe",
      response_format: "json",
    },
    { signal, maxRetries: 0 },
  );
  const text = transcript.text.trim();
  if (!text)
    throw new AppError(
      422,
      "No speech was detected. Please try again or type your message.",
    );
  if (text.length > 6000)
    throw new AppError(
      422,
      "That transcript is too long. Please record a shorter message.",
    );
  return text;
}
