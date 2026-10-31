"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkles, Check } from "lucide-react";
import type { EventInput } from "@/lib/validation";
import type { EventState } from "@/lib/types";
import { api } from "./api";
import AppearanceSelect from "./appearance";
const initial: EventInput = {
  name: "",
  eventType: "Wedding",
  date: "2027-02-14",
  location: "",
  guestCount: 250,
  budget: 1200000,
  currency: "INR",
  theme: "Modern elegance",
  preferences: [],
  priorities: ["Photography", "Catering"],
  sustainable: false,
  venueCapacity: null,
};
export default function CreateEvent() {
  const router = useRouter();
  const [input, setInput] = useState(initial);
  const [text, setText] = useState("");
  const [tab, setTab] = useState("ai");
  const [review, setReview] = useState(false);
  const [assumptions, setAssumptions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function extract() {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ event: EventInput; assumptions: string[] }>(
        "extract",
        "POST",
        { text },
      );
      setInput(result.event);
      setAssumptions(result.assumptions);
      setReview(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const event = await api<EventState>("events", "POST", input);
      localStorage.setItem("eventiq-event", event.id);
      router.push("/dashboard");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  function field<K extends keyof EventInput>(key: K, value: EventInput[K]) {
    setInput((p) => ({ ...p, [key]: value }));
  }
  return (
    <div className="create-page">
      <div className="create-toolbar">
        <Link href="/dashboard" className="back">
          <ArrowLeft size={17} /> Back to workspace
        </Link>
        <AppearanceSelect />
      </div>
      <div className="create-heading">
        <span className="brand-icon large">
          <Sparkles />
        </span>
        <span className="eyebrow">THE START OF SOMETHING SPECIAL</span>
        <h1>What are we celebrating?</h1>
        <p>Bring the idea. We’ll help with the details.</p>
      </div>
      <div className="create-card">
        <div className="tabs">
          <button
            className={tab === "ai" ? "active" : ""}
            onClick={() => setTab("ai")}
          >
            <Sparkles size={16} /> Describe your event
          </button>
          <button
            className={tab === "form" ? "active" : ""}
            onClick={() => setTab("form")}
          >
            Fill in the details
          </button>
        </div>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        {tab === "ai" && !review ? (
          <div className="natural-input">
            <label htmlFor="event-description">
              Tell us a little about your plans
            </label>
            <textarea
              id="event-description"
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Wedding in Delhi, February 2027, 250 guests, ₹12 lakh budget. We love beautiful photography, great food and a memorable guest experience."
            />
            <div className="muted">
              Include the occasion, location, date, guest count and budget.
              You’ll review the details before creating.
            </div>
            <button
              className="button"
              disabled={busy || text.length < 10}
              onClick={extract}
            >
              {busy ? "Understanding your event…" : "Build my event brief"}
              <ArrowRight size={17} />
            </button>
          </div>
        ) : (
          <form onSubmit={create}>
            <div className="form-intro">
              <h2>
                {review ? "Your event, at a glance." : "Let’s make it yours."}
              </h2>
              <p>Review the details below. You can adjust your plan anytime.</p>
            </div>
            {assumptions.length > 0 && (
              <div className="notice">
                <b>Assumptions to review</b>
                {assumptions.map((a) => (
                  <p key={a}>{a}</p>
                ))}
              </div>
            )}
            <div className="form-grid">
              <label>
                Event name
                <input
                  required
                  value={input.name}
                  onChange={(e) => field("name", e.target.value)}
                  placeholder="Delhi Modern Wedding"
                />
              </label>
              <label>
                Event type
                <select
                  value={input.eventType}
                  onChange={(e) =>
                    field(
                      "eventType",
                      e.target.value as EventInput["eventType"],
                    )
                  }
                >
                  {[
                    "Wedding",
                    "Birthday",
                    "Community",
                    "Corporate",
                    "Private",
                    "Custom",
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label>
                Event date
                <input
                  type="date"
                  required
                  value={input.date}
                  onChange={(e) => field("date", e.target.value)}
                />
              </label>
              <label>
                Location
                <input
                  required
                  value={input.location}
                  onChange={(e) => field("location", e.target.value)}
                  placeholder="City, country"
                />
              </label>
              <label>
                Guests
                <input
                  type="number"
                  min={1}
                  max={100000}
                  required
                  value={input.guestCount}
                  onChange={(e) => field("guestCount", Number(e.target.value))}
                />
              </label>
              <label>
                Total budget
                <input
                  type="number"
                  min={100}
                  max={1000000000}
                  required
                  value={input.budget}
                  onChange={(e) => field("budget", Number(e.target.value))}
                />
              </label>
              <label>
                Currency
                <select
                  value={input.currency}
                  onChange={(e) =>
                    field("currency", e.target.value as EventInput["currency"])
                  }
                >
                  {["INR", "USD", "EUR", "GBP"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Theme
                <input
                  value={input.theme}
                  onChange={(e) => field("theme", e.target.value)}
                />
              </label>
              <label>
                Priorities (comma separated)
                <input
                  value={input.priorities.join(",")}
                  onChange={(e) =>
                    field("priorities", e.target.value.split(","))
                  }
                />
              </label>
              <label>
                Preferences (comma separated)
                <input
                  value={input.preferences.join(",")}
                  onChange={(e) =>
                    field("preferences", e.target.value.split(","))
                  }
                />
              </label>
            </div>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={input.sustainable}
                onChange={(e) => field("sustainable", e.target.checked)}
              />{" "}
              Make sustainability part of the plan
            </label>
            <div className="form-footer">
              <span>
                <Check size={16} /> Your details stay editable
              </span>
              <button className="button" disabled={busy}>
                {busy ? "Creating your plan…" : "Create event & plan"}
                <ArrowRight size={17} />
              </button>
            </div>
          </form>
        )}
      </div>
      <p className="create-footnote">Smarter Planning. Better Celebrations.</p>
    </div>
  );
}
