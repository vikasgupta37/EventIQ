"use client";
import { Sparkles, ArrowUpRight, Check, Send, Clock } from "lucide-react";
import type { EventState } from "@/lib/types";
import Badge from "./badge";
import VoiceControls from "../voice-controls";
import { money } from "@/lib/engines";
import { longDate } from "./dates";
import { useState, useRef, useEffect } from "react";

export default function Planner({
  state,
  mode,
  busy,
  requestPlan,
}: {
  state: EventState;
  mode: string;
  busy: boolean;
  requestPlan: (message: string) => Promise<EventState | null>;
}) {
  const [message, setMessage] = useState("");
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [speechRequest, setSpeechRequest] = useState<{
    id: number;
    text: string;
  } | null>(null);
  const voiceReplySequence = useRef(0);
  const chatEnd = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: "nearest" });
  }, [state.messages.length]);
  async function send(text = message) {
    if (!text.trim() || busy || voiceBusy) return;
    const next = await requestPlan(text);
    if (!next) return;
    setMessage("");
    const reply = next.messages.findLast(
      (m) => m.role === "assistant",
    )?.content;
    if (reply)
      setSpeechRequest({ id: ++voiceReplySequence.current, text: reply });
  }
  const fmt = (n: number) => money(n, state.currency);
  return (
    <div className="planner-grid">
      <section className="card chat-card">
        <div className="chat-header">
          <span className="brand-icon">
            <Sparkles size={21} />
          </span>
          <div>
            <b>Your planning partner</b>
            <small>
              {mode === "ai"
                ? "Connected to your event"
                : "Offline demo · limited commands"}
            </small>
          </div>
          <Badge color="green">State connected</Badge>
        </div>
        <div
          className="chat-messages"
          role="log"
          aria-label="Planner conversation"
          aria-live="polite"
          aria-relevant="additions text"
        >
          {!state.messages.length && (
            <div className="chat-welcome">
              <Sparkles size={32} />
              <h2>A good plan starts with a conversation.</h2>
              <p>
                I can help adjust your budget, update guest numbers and keep the
                details in sync. What’s on your mind?
              </p>
              <div className="suggestions">
                {[
                  "What should I do this week?",
                  "Reduce my budget to ₹10 lakh.",
                  "Increase guests to 350.",
                  "Make it eco-friendly.",
                ].map((s) => (
                  <button key={s} onClick={() => send(s)} disabled={busy}>
                    {s}
                    <ArrowUpRight size={13} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {state.messages.map((m, i) => (
            <div className={`message ${m.role}`} key={m.id ?? i}>
              <span className="message-avatar">
                {m.role === "user" ? "You" : <Sparkles size={16} />}
              </span>
              <div>
                <b>{m.role === "user" ? "You" : "EventIQ"}</b>
                <p>{m.content}</p>
              </div>
            </div>
          ))}
          <div ref={chatEnd} />
          {busy && (
            <div className="thinking">
              <span className="spinner" /> Reviewing your event and its
              dependencies…
            </div>
          )}
        </div>
        <VoiceControls
          key={state.id}
          eventId={state.id}
          disabled={busy}
          onTranscript={(text) =>
            setMessage((current) =>
              [current.trim(), text].filter(Boolean).join(" "),
            )
          }
          onBusyChange={setVoiceBusy}
          speechRequest={speechRequest}
          latestReply={
            state.messages.findLast((m) => m.role === "assistant")?.content ??
            ""
          }
        />
        <form
          className="chat-input"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <label className="sr-only" htmlFor="chat-message">
            Message your event planner
          </label>
          <textarea
            id="chat-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="A new idea? A change of plans? Let’s talk."
            rows={2}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <button
            className="button"
            disabled={busy || voiceBusy || !message.trim()}
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </form>
        <small className="chat-disclaimer">
          AI changes require your approval in the preview. Estimates are not
          confirmed supplier prices.
        </small>
      </section>
      <aside className="planner-context">
        <section className="card">
          <div className="card-heading">
            <h2>Your event brief</h2>
          </div>
          <h3>{state.name}</h3>
          <dl>
            <div>
              <dt>Date</dt>
              <dd>{longDate(state.date)}</dd>
            </div>
            <div>
              <dt>Guests</dt>
              <dd>{state.guestCount}</dd>
            </div>
            <div>
              <dt>Budget</dt>
              <dd>{fmt(state.budget)}</dd>
            </div>
            <div>
              <dt>Sustainability</dt>
              <dd>{state.sustainable ? "Included" : "Not requested"}</dd>
            </div>
          </dl>
        </section>
        <section className="card action-log">
          <div className="card-heading">
            <h2>Planner activity</h2>
            <Clock size={17} />
          </div>
          {state.actions.length ? (
            state.actions.slice(0, 10).map((a, i) => (
              <div key={a.id ?? i}>
                <span>
                  <Check size={12} />
                </span>
                <p>
                  {a.summary}
                  <small>{a.tool}</small>
                </p>
              </div>
            ))
          ) : (
            <p>No changes yet.</p>
          )}
        </section>
      </aside>
    </div>
  );
}
