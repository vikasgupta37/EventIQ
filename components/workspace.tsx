"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
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
  Bell,
  Users,
  ChevronDown,
  X,
  Menu,
  History,
  Receipt,
} from "lucide-react";
import type { Task } from "@/lib/types";
import { useWorkspaceData } from "./workspace/use-workspace-data";
import BrowserData from "./browser-data";
import { browserStorageEnabled } from "@/lib/storage-mode";
import AppearanceSelect from "./appearance";
import LiveClock from "./live-clock";
import AccountMenu, { type WorkspaceAccount } from "./account-menu";
const Dashboard = dynamic(() => import("./workspace/dashboard"));
const Planner = dynamic(() => import("./workspace/planner"));
const Budget = dynamic(() => import("./workspace/budget"));
const Timeline = dynamic(() => import("./workspace/timeline"));
const Tasks = dynamic(() => import("./workspace/tasks"));
const Vendors = dynamic(() => import("./workspace/vendors"));
const Ideas = dynamic(() => import("./workspace/ideas"));
const Risks = dynamic(() => import("./workspace/risks"));
const Guests = dynamic(() => import("./guests"));
const Expenses = dynamic(() => import("./expenses"));
const ChangeReview = dynamic(() => import("./change-review"));
const TaskEditor = dynamic(() => import("./workspace/task-editor"));
const EventSettings = dynamic(() => import("./workspace/event-settings"));
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
export default function Workspace({
  section,
  account = { name: "Demo Planner", email: "demo@eventiq.local", demo: true },
}: {
  section: string;
  account?: WorkspaceAccount;
}) {
  const {
    events,
    state,
    mode,
    loading,
    busy,
    error,
    setError,
    notice,
    setNotice,
    selectEvent,
    mutate,
    requestPlan,
    rebalance,
    acceptState,
  } = useWorkspaceData();
  const [mobile, setMobile] = useState(false);
  const [notifications, setNotifications] = useState(false);

  const [taskEditor, setTaskEditor] = useState<Partial<Task> | null>(null);
  const [settings, setSettings] = useState(false);
  const navigation = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!mobile) return;
    const panel = navigation.current;
    const trigger = menuButton.current;
    const items = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          "a[href],button:not(:disabled),select:not(:disabled)",
        ) ?? [],
      ).filter((item) => !item.closest("[hidden]"));
    items()[0]?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobile(false);
      if (event.key === "Tab") {
        const controls = items();
        const first = controls[0],
          last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      trigger?.focus();
    };
  }, [mobile]);
  const sectionTitle = nav.find((n) => n[0] === section)?.[1] ?? "Overview";
  return (
    <div className={`app-shell section-${section}`}>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <aside
        ref={navigation}
        id="workspace-navigation"
        aria-label="Workspace navigation"
        className={`sidebar ${mobile ? "open" : ""}`}
      >
        {mobile && (
          <button
            className="text-button mobile-close"
            onClick={() => setMobile(false)}
          >
            Close navigation <X size={16} />
          </button>
        )}
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
            disabled={busy}
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
        <nav className="side-nav" aria-label="Planning sections">
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
          aria-label="Dismiss navigation overlay"
          tabIndex={-1}
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="icon-button mobile-menu"
              ref={menuButton}
              onClick={() => setMobile(!mobile)}
              aria-label="Open navigation"
              aria-expanded={mobile}
              aria-controls="workspace-navigation"
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
              {mode === "ai"
                ? "AI configured"
                : browserStorageEnabled()
                  ? "Demo planner"
                  : "Offline demo"}
            </span>
            <LiveClock />
            <AppearanceSelect />
            <button
              className="icon-button notification-button"
              aria-label="Show notifications"
              aria-expanded={notifications}
              aria-controls="planning-notifications"
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
            <div
              className="notifications"
              id="planning-notifications"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setNotifications(false);
                  document
                    .querySelector<HTMLButtonElement>(
                      '[aria-controls="planning-notifications"]',
                    )
                    ?.focus();
                }
              }}
            >
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
        <main
          id="main-content"
          tabIndex={-1}
          className="workspace-main"
          aria-busy={loading}
        >
          <BrowserData />
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
            <div className="loading" role="status">
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
                <Guests
                  key={`guests-${state.id}`}
                  state={state}
                  onState={acceptState}
                />
              )}
              {section === "expenses" && (
                <Expenses
                  key={`expenses-${state.id}`}
                  state={state}
                  onState={acceptState}
                />
              )}
              {["planner", "budget", "history"].includes(section) && (
                <ChangeReview
                  key={`changereview-${state.id}`}
                  state={state}
                  onState={acceptState}
                  compact={section !== "history"}
                />
              )}
              {section === "dashboard" && (
                <Dashboard
                  key={`dashboard-${state.id}`}
                  state={state}
                  mode={mode}
                  busy={busy}
                  mutate={mutate}
                  onEdit={() => setSettings(true)}
                  onAddTask={() => setTaskEditor({ dueDate: state.date })}
                />
              )}
              {section === "planner" && (
                <Planner
                  key={`planner-${state.id}`}
                  state={state}
                  mode={mode}
                  busy={busy}
                  requestPlan={requestPlan}
                />
              )}
              {section === "budget" && (
                <Budget
                  key={`budget-${state.id}`}
                  state={state}
                  mode={mode}
                  busy={busy}
                  rebalance={rebalance}
                />
              )}
              {section === "timeline" && (
                <Timeline key={`timeline-${state.id}`} state={state} />
              )}
              {section === "tasks" && (
                <Tasks
                  key={`tasks-${state.id}`}
                  state={state}
                  busy={busy}
                  mutate={mutate}
                  onEdit={setTaskEditor}
                />
              )}
              {section === "vendors" && (
                <Vendors
                  key={`vendors-${state.id}`}
                  state={state}
                  busy={busy}
                  mutate={mutate}
                />
              )}
              {section === "ideas" && (
                <Ideas key={`ideas-${state.id}`} state={state} />
              )}
              {section === "risks" && (
                <Risks key={`risks-${state.id}`} state={state} />
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
        <TaskEditor
          state={state}
          busy={busy}
          error={error}
          mutate={mutate}
          onClose={() => setTaskEditor(null)}
          taskEditor={taskEditor}
        />
      )}
      {settings && state && (
        <EventSettings
          state={state}
          busy={busy}
          error={error}
          mutate={mutate}
          onClose={() => setSettings(false)}
        />
      )}
    </div>
  );
}
