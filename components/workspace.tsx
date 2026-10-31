"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  LayoutDashboard,
  Wallet,
  CalendarDays,
  ListChecks,
  Store,
  Lightbulb,
  ShieldAlert,
  Plus,
  ArrowUpRight,
  ArrowRight,
  Bell,
  MapPin,
  Users,
  ChevronDown,
  Check,
  Send,
  Leaf,
  X,
  Menu,
  Clock,
  Trash2,
  Pencil,
  History,
  Receipt,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { EventState, Task } from "@/lib/types";
import { daysUntil, money } from "@/lib/engines";
import { api } from "./api";
import VoiceControls from "./voice-controls";
import Guests from "./guests";
import Expenses from "./expenses";
import ChangeReview from "./change-review";
import AppearanceSelect from "./appearance";
import CelebrationArt from "./celebration-art";
import LiveClock from "./live-clock";
import AccountMenu, { type WorkspaceAccount } from "./account-menu";
const nav = [
  ["dashboard", "Overview", LayoutDashboard],
  ["planner", "AI Planner", Sparkles],
  ["tasks", "Tasks", ListChecks],
  ["timeline", "Timeline", CalendarDays],
  ["guests", "Guests & RSVPs", Users],
  ["vendors", "Vendors", Store],
  ["budget", "Budget", Wallet],
  ["expenses", "Expenses & payments", Receipt],
  ["ideas", "Ideas & inspiration", Lightbulb],
  ["risks", "Risks & insights", ShieldAlert],
  ["history", "Plan history", History],
] as const;
const colors = [
  "#167568",
  "#4c9e8a",
  "#91c2ad",
  "#e88e73",
  "#f0b39a",
  "#ddbc70",
  "#708b9e",
  "#a2b6c2",
  "#a8b88d",
  "#d9d7b8",
];
type EventSummary = {
  id: string;
  name: string;
  date: string;
  eventType: string;
};
function Badge({
  children,
  color = "",
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return <span className={`badge ${color}`}>{children}</span>;
}
export default function Workspace({
  section,
  account = { name: "Demo Planner", email: "demo@eventiq.local", demo: true },
}: {
  section: string;
  account?: WorkspaceAccount;
}) {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [state, setState] = useState<EventState | null>(null);
  const [mode, setMode] = useState("demo");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mobile, setMobile] = useState(false);
  const [notifications, setNotifications] = useState(false);

  const [message, setMessage] = useState("");
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [speechRequest, setSpeechRequest] = useState<{
    id: number;
    text: string;
  } | null>(null);
  const voiceReplySequence = useRef(0);
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("date");
  const [taskEditor, setTaskEditor] = useState<Partial<Task> | null>(null);
  const [settings, setSettings] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: "nearest" });
  }, [state?.messages.length]);
  useEffect(() => {
    if (!taskEditor && !settings) return;
    const previous = document.activeElement as HTMLElement;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input,textarea,select,a[href]",
        ) ?? [],
      );
    focusable()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSettings(false);
        setTaskEditor(null);
      }
      if (e.key === "Tab") {
        const items = focusable();
        const first = items[0];
        const last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [taskEditor, settings]);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = await api<{ events: EventSummary[]; mode: string }>(
          "events",
        );
        if (!active) return;
        setEvents(result.events);
        setMode(result.mode);
        const stored = localStorage.getItem("eventiq-event");
        const id =
          result.events.find((e) => e.id === stored)?.id ??
          result.events[0]?.id;
        if (id) {
          const data = await api<EventState>(`events/${id}`);
          if (active) setState(data);
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);
  async function selectEvent(id: string) {
    setLoading(true);
    setError("");
    try {
      setState(await api<EventState>(`events/${id}`));
      localStorage.setItem("eventiq-event", id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  async function mutate(path: string, method: string, body?: unknown) {
    setBusy(true);
    setError("");
    try {
      const next = await api<EventState>(path, method, body);
      setState(next);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function send(text = message) {
    if (!state || !text.trim() || busy || voiceBusy) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ state: EventState; mode: string }>(
        `events/${state.id}/chat`,
        "POST",
        { message: text },
      );
      setState(result.state);
      setMode(result.mode);
      setMessage("");
      const reply = result.state.messages.findLast(
        (m) => m.role === "assistant",
      )?.content;
      if (reply)
        setSpeechRequest({ id: ++voiceReplySequence.current, text: reply });
      setNotice("Your planner has reviewed the request.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function rebalance() {
    if (!state) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ state: EventState }>(
        `events/${state.id}/budget/rebalance`,
        "POST",
        {},
      );
      setState(result.state);
      setNotice(
        "Budget changes are ready to review below. Apply the preview to save them.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const spend = state?.categories.reduce((a, c) => a + c.estimated, 0) ?? 0;
  const completed =
    state?.tasks.filter((t) => t.status === "Completed").length ?? 0;
  const booked =
    state?.vendors.filter((v) => v.status === "Booked").length ?? 0;
  const fmt = (n: number) => money(n, state?.currency);
  const upcoming =
    state?.tasks
      .filter((t) => t.status !== "Completed")
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 4) ?? [];
  const sectionTitle = nav.find((n) => n[0] === section)?.[1] ?? "Overview";
  function taskRows(tasks: Task[]) {
    return tasks.map((t) => (
      <div className="task-row" key={t.id}>
        <button
          className={`task-check ${t.status === "Completed" ? "checked" : ""}`}
          disabled={busy}
          aria-label={`${t.status === "Completed" ? "Reopen" : "Complete"} ${t.title}`}
          onClick={() =>
            mutate(`tasks/${t.id}`, "PATCH", {
              status: t.status === "Completed" ? "Not Started" : "Completed",
            })
          }
        >
          {t.status === "Completed" && <Check size={13} />}
        </button>
        <div className="task-name">
          <b>{t.title}</b>
          <span>
            {t.category} <i>·</i> {t.owner}
          </span>
        </div>
        <Badge color={t.priority === "High" ? "amber" : ""}>{t.priority}</Badge>
        <span className="task-date">{shortDate(t.dueDate)}</span>
        {section === "tasks" && (
          <>
            <select
              aria-label={`Status of ${t.title}`}
              disabled={busy}
              value={t.status}
              onChange={(e) =>
                mutate(`tasks/${t.id}`, "PATCH", { status: e.target.value })
              }
            >
              {["Not Started", "In Progress", "Completed", "Blocked"].map(
                (s) => (
                  <option key={s}>{s}</option>
                ),
              )}
            </select>
            <button
              className="icon-button"
              aria-label={`Edit ${t.title}`}
              onClick={() => setTaskEditor(t)}
            >
              <Pencil size={15} />
            </button>
            <button
              className="icon-button"
              disabled={busy}
              aria-label={`Delete ${t.title}`}
              onClick={() => {
                if (confirm(`Delete “${t.title}”?`))
                  void mutate(`tasks/${t.id}`, "DELETE");
              }}
            >
              <Trash2 size={15} />
            </button>
          </>
        )}
      </div>
    ));
  }
  function budgetChart() {
    return (
      <div className="budget-chart">
        <div className="donut">
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie
                data={state?.categories}
                dataKey="allocated"
                nameKey="name"
                innerRadius={65}
                outerRadius={87}
                paddingAngle={2}
                stroke="none"
              >
                {state?.categories.map((c, i) => (
                  <Cell key={c.id} fill={colors[i]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => fmt(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-center">
            <small>Allocated</small>
            <b>{fmt((state?.budget ?? 0) - (state?.contingency ?? 0))}</b>
          </div>
        </div>
        <div className="chart-legend">
          {state?.categories.slice(0, 5).map((c, i) => (
            <div key={c.id}>
              <span>
                <i style={{ background: colors[i] }} />
                {c.name}
              </span>
              <b>{fmt(c.allocated)}</b>
            </div>
          ))}
          <small>+ 5 more categories · 10% reserve</small>
        </div>
      </div>
    );
  }
  return (
    <div className={`app-shell section-${section}`}>
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <Link className="brand" href="/">
          <span className="brand-icon">
            <Sparkles size={21} />
          </span>
          Event<span>IQ</span>
        </Link>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <label className="event-switcher">
          <span className="event-symbol">✧</span>
          <select
            aria-label="Select event"
            value={state?.id ?? ""}
            onChange={(e) => selectEvent(e.target.value)}
          >
            {!events.length && <option>No events yet</option>}
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <ChevronDown size={13} />
        </label>
        <nav className="side-nav">
          {nav.map(([slug, label, Icon]) => (
            <Link
              key={slug}
              href={`/${slug}`}
              aria-current={section === slug ? "page" : undefined}
              onClick={() => setMobile(false)}
              className={section === slug ? "active" : ""}
            >
              <Icon size={18} />
              {label}
              {slug === "planner" && <span className="ai-label">AI</span>}
              {slug === "risks" && !!state?.risks.length && (
                <span className="nav-count">{state.risks.length}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="small-promo">
            <Sparkles size={21} />
            <b>Big moments. Less stress.</b>
            <p>Your next celebration starts with a little inspiration.</p>
            <Link href="/events/new">
              Create an event <Plus size={15} />
            </Link>
          </div>
          <AccountMenu account={account} />
        </div>
      </aside>
      {mobile && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobile(!mobile)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <span className="breadcrumb">
              Workspace <span>/</span>
            </span>
            <b>{sectionTitle}</b>
          </div>
          <div className="header-utilities">
            <span className="mode">
              <span className="live-dot" />
              {mode === "ai" ? "AI configured" : "Offline demo"}
            </span>
            <LiveClock />
            <AppearanceSelect />
            <button
              className="icon-button notification-button"
              aria-label="Show notifications"
              onClick={() => setNotifications(!notifications)}
            >
              <Bell size={19} />
              {!!state?.risks.length && <i />}
            </button>
            <span className="avatar small" title={account.name}>
              {account.name[0]?.toUpperCase()}
            </span>
          </div>
          {notifications && (
            <div className="notifications">
              <b>Planning updates</b>
              {state?.risks.length ? (
                state.risks.map((r) => (
                  <Link
                    href="/risks"
                    key={r.id}
                    onClick={() => setNotifications(false)}
                  >
                    {r.title}
                    <small>{r.severity} priority</small>
                  </Link>
                ))
              ) : (
                <p>You’re all caught up.</p>
              )}
            </div>
          )}
        </header>
        <main className="workspace-main">
          {error && (
            <div className="error" role="alert">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="success" role="status">
              {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {loading ? (
            <div className="loading">
              <span className="spinner" />
              <h2>Bringing your plans together…</h2>
            </div>
          ) : !state ? (
            <div className="empty-state">
              <Sparkles size={40} />
              <h1>Your next great event starts here.</h1>
              <p>
                Create an event to bring your budget, tasks and ideas together.
              </p>
              <Link href="/events/new" className="button">
                Create your first event <Plus size={17} />
              </Link>
            </div>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    {section === "dashboard"
                      ? "GOOD PLANS. GREAT MEMORIES."
                      : state.name.toUpperCase()}
                  </div>
                  <h1>
                    {section === "dashboard"
                      ? "Your planning studio."
                      : sectionTitle}
                  </h1>
                  <p>
                    {
                      (
                        {
                          dashboard:
                            "A little less planning. A lot more to look forward to.",
                          planner:
                            "Think out loud. Your planner will connect the details.",
                          budget: "Make room for what matters most.",
                          timeline: "Every milestone, thoughtfully timed.",
                          tasks: "Small steps toward a remarkable day.",
                          vendors:
                            "The right people to bring your vision to life.",
                          ideas: "Thoughtful touches. Unforgettable moments.",
                          risks: "A little foresight goes a long way.",
                          guests:
                            "Every person, preference and place at the table.",
                          expenses:
                            "From the first quote to the final payment.",
                          history:
                            "Review what changes. Keep control of your plan.",
                        } as Record<string, string>
                      )[section]
                    }
                  </p>
                </div>
                <Link className="button secondary" href="/events/new">
                  <Plus size={16} /> New event
                </Link>
              </div>
              {section === "guests" && (
                <Guests key={state.id} state={state} onState={setState} />
              )}
              {section === "expenses" && (
                <Expenses key={state.id} state={state} onState={setState} />
              )}
              {["planner", "budget", "history"].includes(section) && (
                <ChangeReview
                  key={state.id}
                  state={state}
                  onState={setState}
                  compact={section !== "history"}
                />
              )}
              {section === "dashboard" && (
                <>
                  <section className="event-banner celebration-banner">
                    <div className="event-banner-content">
                      <Badge color="lavender">
                        {state.eventType} <span>·</span> {state.theme}
                      </Badge>
                      <h2>{state.name}</h2>
                      <div className="event-meta">
                        <span>
                          <CalendarDays size={16} />
                          {longDate(state.date)}
                        </span>
                        <span>
                          <MapPin size={16} />
                          {state.location}
                        </span>
                        <span>
                          <Users size={16} />
                          {state.guestCount} guests
                        </span>
                      </div>
                      <div className="event-banner-actions">
                        <Link className="button hero-planner" href="/planner">
                          <Sparkles size={16} /> Plan with AI{" "}
                          <ArrowUpRight size={16} />
                        </Link>
                        <button
                          className="text-button"
                          onClick={() => setSettings(true)}
                        >
                          Edit event details <Pencil size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="celebration-art-wrap">
                      <CelebrationArt />
                    </div>
                    <div className="event-banner-footer">
                      <div className="event-day-counter">
                        <span>{Math.abs(daysUntil(state.date))}</span>
                        <div>
                          <b>
                            {daysUntil(state.date) < 0
                              ? "days since your event"
                              : "days to your big day"}
                          </b>
                          <small>Every detail brings it closer.</small>
                        </div>
                      </div>
                      <Link href="/tasks" className="event-next-step">
                        <span>
                          <small>
                            {upcoming.length
                              ? "YOUR NEXT MOVE"
                              : "LOOK AT YOU GO"}
                          </small>
                          <b>
                            {upcoming[0]?.title ??
                              "All tasks complete. Time to celebrate."}
                          </b>
                        </span>
                        <ArrowUpRight size={19} />
                      </Link>
                    </div>
                  </section>
                  <div className="stat-grid">
                    {[
                      [
                        Wallet,
                        "Total budget",
                        fmt(state.budget),
                        "Your celebration, your priorities",
                      ],
                      [
                        CalendarDays,
                        "Planned spend",
                        fmt(spend),
                        "Estimates · quotes to be confirmed",
                      ],
                      [
                        ShieldAlert,
                        "Remaining budget",
                        fmt(state.budget - spend),
                        "Before contingency reserve",
                      ],
                      [
                        ListChecks,
                        "Planning progress",
                        `${state.progress}%`,
                        `${completed} of ${state.tasks.length} tasks completed`,
                      ],
                    ].map(([Icon, label, value, detail]) => {
                      const I = Icon as typeof Wallet;
                      return (
                        <Link
                          href={
                            label === "Planning progress" ? "/tasks" : "/budget"
                          }
                          className={`stat-card ${label === "Remaining budget" && spend > state.budget ? "stat-warning" : ""}`}
                          key={String(label)}
                        >
                          <div>
                            <span>{String(label)}</span>
                            <I size={18} />
                          </div>
                          <strong>{String(value)}</strong>
                          <small>{String(detail)}</small>
                          {label === "Planning progress" && (
                            <div className="progress-track">
                              <span style={{ width: `${state.progress}%` }} />
                            </div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                  <div
                    className="dashboard-shortcuts"
                    aria-label="Planning shortcuts"
                  >
                    <Link href="/guests">
                      <span className="shortcut-icon">
                        <Users size={21} />
                      </span>
                      <span>
                        <b>Bring everyone together</b>
                        <small>Guest list, RSVPs & seating</small>
                      </span>
                      <ArrowUpRight size={18} />
                    </Link>
                    <Link href="/expenses">
                      <span className="shortcut-icon">
                        <Receipt size={21} />
                      </span>
                      <span>
                        <b>Keep costs in view</b>
                        <small>Quotes, deposits & payments</small>
                      </span>
                      <ArrowUpRight size={18} />
                    </Link>
                    <Link href="/history">
                      <span className="shortcut-icon">
                        <History size={21} />
                      </span>
                      <span>
                        <b>You’re in control</b>
                        <small>Review & approve AI changes</small>
                      </span>
                      <ArrowUpRight size={18} />
                    </Link>
                  </div>
                  <div className="dashboard-section-heading">
                    <div>
                      <span className="eyebrow">MAKE IT HAPPEN</span>
                      <h2>Your planning desk</h2>
                    </div>
                    <Link href="/timeline">
                      See the full timeline <ArrowRight size={15} />
                    </Link>
                  </div>
                  <div className="dashboard-grid">
                    <section className="card tasks-card">
                      <div className="card-heading">
                        <h2>
                          Next on your list{" "}
                          <span className="muted-count">
                            {
                              state.tasks.filter(
                                (t) => t.status !== "Completed",
                              ).length
                            }
                          </span>
                        </h2>
                        <Link href="/tasks">
                          View all <ArrowRight size={14} />
                        </Link>
                      </div>
                      {taskRows(upcoming)}
                      {!upcoming.length && (
                        <p className="empty-inline">
                          All tasks completed. Time to celebrate!
                        </p>
                      )}
                      <button
                        className="add-task"
                        onClick={() => setTaskEditor({ dueDate: state.date })}
                      >
                        <Plus size={15} /> Add a task
                      </button>
                    </section>
                    <section className="card">
                      <div className="card-heading">
                        <h2>Budget at a glance</h2>
                        <Link href="/budget">
                          <ArrowUpRight size={17} />
                          <span className="sr-only">View budget</span>
                        </Link>
                      </div>
                      {budgetChart()}
                    </section>
                    <section className="card ai-card">
                      <div className="card-heading">
                        <h2>
                          <Sparkles size={18} /> A little help from AI
                        </h2>
                        <Badge color="lavender">
                          {mode === "ai" ? "Personalized" : "Demo suggestions"}
                        </Badge>
                      </div>
                      <p className="card-subtitle">
                        Ideas that keep your celebration feeling like you.
                      </p>
                      {state.recommendations.slice(0, 2).map((r, i) => (
                        <div className="recommendation-row" key={r.id}>
                          <span className="idea-icon">
                            {i === 0 ? (
                              <Lightbulb size={20} />
                            ) : (
                              <Leaf size={20} />
                            )}
                          </span>
                          <div>
                            <b>{r.idea}</b>
                            <p>{r.reason}</p>
                          </div>
                        </div>
                      ))}
                      <Link className="text-button" href="/planner">
                        Let’s talk about your plan <ArrowRight size={15} />
                      </Link>
                    </section>
                    <section className="card">
                      <div className="card-heading">
                        <h2>Your dream team</h2>
                        <Link href="/vendors">
                          Manage <ArrowRight size={14} />
                        </Link>
                      </div>
                      <div className="vendor-summary">
                        <span>
                          <b>{booked}</b> / {state.vendors.length}
                        </span>
                        <p>services booked</p>
                        <Badge color="green">Building your team</Badge>
                      </div>
                      <div className="vendor-blocks">
                        {state.vendors.map((v) => (
                          <span
                            key={v.id}
                            title={`${v.name}: ${v.status}`}
                            className={v.status === "Booked" ? "booked" : ""}
                          />
                        ))}
                      </div>
                      <div className="mini-vendors">
                        {state.vendors.slice(0, 3).map((v) => (
                          <div key={v.id}>
                            <Store size={16} />
                            <span>{v.name}</span>
                            <Badge
                              color={v.status === "Booked" ? "green" : "amber"}
                            >
                              {v.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </section>
                    <section className="card">
                      <div className="card-heading">
                        <h2>Ahead on the timeline</h2>
                        <Link href="/timeline">
                          Full timeline <ArrowRight size={14} />
                        </Link>
                      </div>
                      <div className="mini-timeline">
                        {state.timeline.slice(0, 3).map((t) => (
                          <div key={t.id}>
                            <span className="timeline-dot" />
                            <small>{shortDate(t.dueDate)}</small>
                            <b>{t.title}</b>
                          </div>
                        ))}
                      </div>
                    </section>
                    <section className="card attention-card">
                      <div className="card-heading">
                        <h2>
                          <ShieldAlert size={18} /> Worth a little attention
                        </h2>
                        <Badge color="amber">
                          {state.risks.length} insights
                        </Badge>
                      </div>
                      {state.risks.slice(0, 2).map((r) => (
                        <div className="risk-preview" key={r.id}>
                          <span
                            className={`risk-dot ${r.severity === "High" ? "high" : ""}`}
                          />
                          <div>
                            <b>{r.title}</b>
                            <p>{r.action}</p>
                          </div>
                        </div>
                      ))}
                      <Link className="text-button" href="/risks">
                        Explore insights <ArrowRight size={15} />
                      </Link>
                    </section>
                  </div>
                </>
              )}
              {section === "planner" && (
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
                    <div className="chat-messages" aria-live="polite">
                      {!state.messages.length && (
                        <div className="chat-welcome">
                          <Sparkles size={32} />
                          <h2>A good plan starts with a conversation.</h2>
                          <p>
                            I can help adjust your budget, update guest numbers
                            and keep the details in sync. What’s on your mind?
                          </p>
                          <div className="suggestions">
                            {[
                              "What should I do this week?",
                              "Reduce my budget to ₹10 lakh.",
                              "Increase guests to 350.",
                              "Make it eco-friendly.",
                            ].map((s) => (
                              <button
                                key={s}
                                onClick={() => send(s)}
                                disabled={busy}
                              >
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
                          <span className="spinner" /> Reviewing your event and
                          its dependencies…
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
                        state.messages.findLast((m) => m.role === "assistant")
                          ?.content ?? ""
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
                          if (e.key === "Enter" && !e.shiftKey) {
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
                      AI changes require your approval in the preview. Estimates
                      are not confirmed supplier prices.
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
                          <dd>
                            {state.sustainable ? "Included" : "Not requested"}
                          </dd>
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
              )}
              {section === "budget" && (
                <>
                  <div className="budget-summary">
                    <div className="card">
                      <small>Total budget</small>
                      <strong>{fmt(state.budget)}</strong>
                    </div>
                    <div className="card">
                      <small>Estimated spending</small>
                      <strong>{fmt(spend)}</strong>
                    </div>
                    <div className="card">
                      <small>Contingency reserve</small>
                      <strong>{fmt(state.contingency)}</strong>
                    </div>
                    <div className="card">
                      <small>After spend & reserve</small>
                      <strong
                        className={
                          state.budget - spend - state.contingency < 0
                            ? "negative"
                            : ""
                        }
                      >
                        {fmt(state.budget - spend - state.contingency)}
                      </strong>
                    </div>
                  </div>
                  {spend + state.contingency > state.budget && (
                    <div className="notice">
                      Your estimates and reserve exceed your target. Compare
                      supplier quotes and adjust optional scope.
                    </div>
                  )}
                  <section className="card">
                    <div className="card-heading">
                      <div>
                        <h2>A thoughtful allocation</h2>
                        <p className="card-subtitle">
                          {mode === "demo"
                            ? "Rule-based demo weights"
                            : "Personalized planning weights"}{" "}
                          · All amounts are estimates
                        </p>
                      </div>
                      <button
                        className="button small"
                        onClick={rebalance}
                        disabled={busy}
                      >
                        <Sparkles size={15} />
                        {busy ? "Reviewing…" : "AI rebalance"}
                      </button>
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th>Allocated</th>
                            <th>Estimated</th>
                            <th>Difference</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {state.categories.map((c, i) => (
                            <tr key={c.id}>
                              <td>
                                <span
                                  className="category-dot"
                                  style={{ background: colors[i] }}
                                />
                                {c.name}
                                <small>{c.priority} priority</small>
                              </td>
                              <td>{fmt(c.allocated)}</td>
                              <td>{fmt(c.estimated)}</td>
                              <td
                                className={
                                  c.allocated < c.estimated ? "negative" : ""
                                }
                              >
                                {fmt(c.allocated - c.estimated)}
                              </td>
                              <td>
                                <Badge
                                  color={
                                    c.allocated < c.estimated
                                      ? "amber"
                                      : "green"
                                  }
                                >
                                  {c.allocated < c.estimated
                                    ? "Review estimate"
                                    : "Within allocation"}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                  <div className="notice">
                    <Lightbulb size={20} />
                    <div>
                      <b>Spend on what matters.</b>
                      <p>
                        Ask the planner to prioritize photography, simplify
                        decor or explore a lower budget. Supplier quotes should
                        replace these planning assumptions before any
                        commitment.
                      </p>
                    </div>
                  </div>
                </>
              )}
              {section === "timeline" && (
                <section className="card full-timeline">
                  {state.timeline.map((t, i) => (
                    <article key={t.id}>
                      <div className="milestone-date">
                        <b>{shortDate(t.dueDate)}</b>
                        <span>{daysUntil(t.dueDate)} days from now</span>
                      </div>
                      <span
                        className={`milestone-number ${t.status === "Completed" ? "done" : ""}`}
                      >
                        {t.status === "Completed" ? (
                          <Check size={17} />
                        ) : (
                          String(i + 1).padStart(2, "0")
                        )}
                      </span>
                      <div className="milestone-content">
                        <Badge color={t.priority === "High" ? "amber" : ""}>
                          {t.priority} priority
                        </Badge>
                        <h3>{t.title}</h3>
                        <p>
                          {t.category} · {t.status}
                        </p>
                        {t.dependencies.length > 0 && (
                          <small>
                            After:{" "}
                            {t.dependencies
                              .map(
                                (d) =>
                                  state.tasks.find((task) => task.id === d)
                                    ?.title ?? d,
                              )
                              .join(", ")}
                          </small>
                        )}
                      </div>
                    </article>
                  ))}
                </section>
              )}
              {section === "tasks" && (
                <section className="card">
                  <div className="card-heading">
                    <div className="filters">
                      <select
                        aria-label="Filter tasks"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        {[
                          "All",
                          "Not Started",
                          "In Progress",
                          "Completed",
                          "Blocked",
                        ].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                      <select
                        aria-label="Sort tasks"
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                      >
                        <option value="date">By due date</option>
                        <option value="priority">By priority</option>
                        <option value="title">By title</option>
                      </select>
                    </div>
                    <button
                      className="button small"
                      onClick={() => setTaskEditor({ dueDate: state.date })}
                    >
                      <Plus size={16} /> Add task
                    </button>
                  </div>
                  <div className="task-list">
                    {taskRows(
                      state.tasks
                        .filter((t) => filter === "All" || t.status === filter)
                        .sort((a, b) =>
                          sort === "title"
                            ? a.title.localeCompare(b.title)
                            : sort === "priority"
                              ? ["High", "Medium", "Low"].indexOf(a.priority) -
                                ["High", "Medium", "Low"].indexOf(b.priority)
                              : a.dueDate.localeCompare(b.dueDate),
                        ),
                    )}
                  </div>
                  {!state.tasks.some(
                    (t) => filter === "All" || t.status === filter,
                  ) && (
                    <p className="empty-inline">No tasks match this filter.</p>
                  )}
                </section>
              )}
              {section === "vendors" && (
                <>
                  <div className="notice">
                    <Store size={20} />
                    <div>
                      <b>Your service checklist</b>
                      <p>
                        These are service requirements, not supplier listings.
                        Collect verified quotes and only mark a service booked
                        after confirmation.
                      </p>
                    </div>
                  </div>
                  <div className="vendor-grid">
                    {state.vendors.map((v) => (
                      <section className="card vendor-card" key={v.id}>
                        <div className="card-heading">
                          <span className="service-icon">
                            <Store size={21} />
                          </span>
                          <select
                            aria-label={`${v.name} status`}
                            disabled={busy}
                            value={v.status}
                            onChange={(e) =>
                              mutate(`vendors/${v.id}`, "PATCH", {
                                status: e.target.value,
                              })
                            }
                          >
                            {[
                              "Needed",
                              "Shortlisted",
                              "Contacted",
                              "Booked",
                              "Rejected",
                            ].map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                        <h2>{v.name}</h2>
                        <div className="vendor-estimate">
                          {fmt(v.estimatedCost)} <span>planning estimate</span>
                        </div>
                        <p className="muted">
                          Book by {longDate(v.bookingDeadline)}
                        </p>
                        <h4>What to look for</h4>
                        <ul>
                          {v.selectionCriteria.map((c) => (
                            <li key={c}>{c}</li>
                          ))}
                        </ul>
                        <details>
                          <summary>Questions to ask</summary>
                          <ul>
                            {v.questions.map((q) => (
                              <li key={q}>{q}</li>
                            ))}
                          </ul>
                        </details>
                        <label className="vendor-notes">
                          Your notes
                          <textarea
                            key={`${v.id}-${v.notes}`}
                            defaultValue={v.notes}
                            placeholder="Shortlisted suppliers, quote details…"
                            rows={2}
                            onBlur={(e) => {
                              if (e.target.value !== v.notes)
                                void mutate(`vendors/${v.id}`, "PATCH", {
                                  notes: e.target.value,
                                });
                            }}
                          />
                        </label>
                      </section>
                    ))}
                  </div>
                </>
              )}
              {section === "ideas" && (
                <>
                  <div className="idea-filters">
                    <button
                      className={filter === "All" ? "selected" : ""}
                      onClick={() => setFilter("All")}
                    >
                      All ideas
                    </button>
                    {state.recommendations.map((r) => (
                      <button
                        key={r.id}
                        className={filter === r.category ? "selected" : ""}
                        onClick={() => setFilter(r.category)}
                      >
                        {r.category}
                      </button>
                    ))}
                  </div>
                  <div className="ideas-grid">
                    {state.recommendations
                      .filter((r) => filter === "All" || r.category === filter)
                      .map((r, i) => (
                        <article className="card idea-card" key={r.id}>
                          <div className={`idea-art art-${i % 4}`}>
                            <span>
                              {
                                [
                                  <Sparkles key="s" />,
                                  <Leaf key="l" />,
                                  <Lightbulb key="i" />,
                                  <Users key="u" />,
                                ][i % 4]
                              }
                            </span>
                            <i />
                            <i />
                            <i />
                          </div>
                          <div className="idea-body">
                            <span className="eyebrow">{r.category}</span>
                            <h2>{r.idea}</h2>
                            <p>{r.reason}</p>
                            <small>{r.impact}</small>
                            <div>
                              <Badge>{r.priority} priority</Badge>
                              <span>
                                {r.estimatedCost
                                  ? `${fmt(r.estimatedCost)} estimated`
                                  : "No added cost assumed"}
                              </span>
                            </div>
                          </div>
                        </article>
                      ))}
                  </div>
                </>
              )}
              {section === "risks" && (
                <div className="risks-list">
                  {state.risks.map((r) => (
                    <section className="card risk-card" key={r.id}>
                      <span
                        className={`risk-icon ${r.severity === "High" ? "high" : ""}`}
                      >
                        <ShieldAlert size={23} />
                      </span>
                      <div>
                        <div className="risk-title">
                          <h2>{r.title}</h2>
                          <Badge
                            color={r.severity === "High" ? "red" : "amber"}
                          >
                            {r.severity} severity
                          </Badge>
                        </div>
                        <p>{r.reason}</p>
                        <div className="risk-facts">
                          <span>
                            Probability: <b>{r.probability}</b>
                          </span>
                          <span>Impact: {r.impact}</span>
                        </div>
                        <div className="risk-action">
                          <Check size={16} />
                          <span>{r.action}</span>
                        </div>
                      </div>
                    </section>
                  ))}
                  {!state.risks.length && (
                    <div className="empty-state">
                      <Check size={40} />
                      <h2>No current risk flags.</h2>
                      <p>Keep quotes and booking statuses up to date.</p>
                    </div>
                  )}
                </div>
              )}
              <div className="workspace-footer">
                <span>
                  <span className="live-dot" /> Saved to your workspace
                </span>
                <span>
                  Made for moments that matter <Sparkles size={12} />
                </span>
              </div>
            </>
          )}
        </main>
        {section !== "planner" && state && (
          <Link href="/planner" className="assistant-shortcut">
            <Sparkles size={18} /> Ask EventIQ <ArrowUpRight size={15} />
          </Link>
        )}
      </div>
      {taskEditor && state && (
        <div className="modal-overlay">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-title"
          >
            <div className="card-heading">
              <h2 id="task-title">
                {taskEditor.id ? "Edit task" : "A new step in the plan"}
              </h2>
              <button
                className="icon-button"
                aria-label="Close task editor"
                onClick={() => setTaskEditor(null)}
              >
                <X />
              </button>
            </div>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                const payload = {
                  title: String(data.get("title")),
                  description: String(data.get("description")),
                  category: String(data.get("category")),
                  priority: String(data.get("priority")),
                  dueDate: String(data.get("dueDate")),
                  owner: String(data.get("owner")),
                  estimatedCost: Number(data.get("estimatedCost")),
                };
                if (
                  await mutate(
                    taskEditor.id
                      ? `tasks/${taskEditor.id}`
                      : `events/${state.id}/tasks`,
                    taskEditor.id ? "PATCH" : "POST",
                    payload,
                  )
                )
                  setTaskEditor(null);
              }}
            >
              <label>
                Task title
                <input name="title" required defaultValue={taskEditor.title} />
              </label>
              <label>
                Description
                <textarea
                  name="description"
                  defaultValue={taskEditor.description}
                />
              </label>
              <div className="form-grid">
                <label>
                  Category
                  <input
                    name="category"
                    required
                    defaultValue={taskEditor.category ?? "Planning"}
                  />
                </label>
                <label>
                  Priority
                  <select
                    name="priority"
                    defaultValue={taskEditor.priority ?? "Medium"}
                  >
                    {["High", "Medium", "Low"].map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Due date
                  <input
                    name="dueDate"
                    type="date"
                    required
                    max={state.date}
                    defaultValue={taskEditor.dueDate}
                  />
                </label>
                <label>
                  Owner
                  <input
                    name="owner"
                    defaultValue={taskEditor.owner ?? "You"}
                  />
                </label>
                <label>
                  Estimated cost
                  <input
                    name="estimatedCost"
                    type="number"
                    min={0}
                    defaultValue={taskEditor.estimatedCost ?? 0}
                  />
                </label>
              </div>
              <button className="button" disabled={busy}>
                {busy ? "Saving…" : "Save task"}
              </button>
            </form>
          </section>
        </div>
      )}
      {settings && state && (
        <div className="modal-overlay">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            <div className="card-heading">
              <h2 id="settings-title">Event details</h2>
              <button
                className="icon-button"
                aria-label="Close event details"
                onClick={() => setSettings(false)}
              >
                <X />
              </button>
            </div>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                if (
                  await mutate(`events/${state.id}`, "PATCH", {
                    name: data.get("name"),
                    date: data.get("date"),
                    location: data.get("location"),
                    guestCount: Number(data.get("guestCount")),
                    budget: Number(data.get("budget")),
                    venueCapacity: data.get("venueCapacity")
                      ? Number(data.get("venueCapacity"))
                      : null,
                  })
                )
                  setSettings(false);
              }}
            >
              <label>
                Event name
                <input name="name" required defaultValue={state.name} />
              </label>
              <div className="form-grid">
                <label>
                  Date
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={state.date}
                  />
                </label>
                <label>
                  Location
                  <input
                    name="location"
                    required
                    defaultValue={state.location}
                  />
                </label>
                <label>
                  Guest count
                  <input
                    name="guestCount"
                    type="number"
                    min={1}
                    required
                    defaultValue={state.guestCount}
                  />
                </label>
                <label>
                  Budget
                  <input
                    name="budget"
                    type="number"
                    min={100}
                    required
                    defaultValue={state.budget}
                  />
                </label>
                <label>
                  Confirmed venue capacity
                  <input
                    name="venueCapacity"
                    type="number"
                    min={1}
                    defaultValue={state.venueCapacity ?? ""}
                    placeholder="Unknown"
                  />
                </label>
              </div>
              <button className="button" disabled={busy}>
                {busy ? "Updating…" : "Save & update plan"}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
function shortDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}
function longDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
