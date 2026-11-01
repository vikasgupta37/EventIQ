"use client";
import {
  Sparkles,
  Wallet,
  CalendarDays,
  ListChecks,
  Store,
  Lightbulb,
  ShieldAlert,
  Plus,
  ArrowUpRight,
  ArrowRight,
  MapPin,
  Users,
  Leaf,
  Pencil,
  History,
  Receipt,
} from "lucide-react";
import type { EventState } from "@/lib/types";
import type { Mutate } from "./types";
import Link from "next/link";
import Badge from "./badge";
import BudgetChart from "../budget-chart";
import TaskRows from "./task-rows";
import CelebrationArt from "../celebration-art";
import { money, daysUntil } from "@/lib/engines";
import { shortDate, longDate } from "./dates";

export default function Dashboard({
  state,
  mode,
  busy,
  mutate,
  onEdit,
  onAddTask,
}: {
  state: EventState;
  mode: string;
  busy: boolean;
  mutate: Mutate;
  onEdit: () => void;
  onAddTask: () => void;
}) {
  const spend = state.categories.reduce((sum, c) => sum + c.estimated, 0);
  const completed = state.tasks.filter((t) => t.status === "Completed").length;
  const booked = state.vendors.filter((v) => v.status === "Booked").length;
  const upcoming = state.tasks
    .filter((t) => t.status !== "Completed")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 4);
  const fmt = (n: number) => money(n, state.currency);
  return (
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
              <Sparkles size={16} /> Plan with AI <ArrowUpRight size={16} />
            </Link>
            <button className="text-button" onClick={() => onEdit()}>
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
                {upcoming.length ? "YOUR NEXT MOVE" : "LOOK AT YOU GO"}
              </small>
              <b>
                {upcoming[0]?.title ?? "All tasks complete. Time to celebrate."}
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
              href={label === "Planning progress" ? "/tasks" : "/budget"}
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
      <div className="dashboard-shortcuts" aria-label="Planning shortcuts">
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
                {state.tasks.filter((t) => t.status !== "Completed").length}
              </span>
            </h2>
            <Link href="/tasks">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <TaskRows tasks={upcoming} busy={busy} mutate={mutate} />
          {!upcoming.length && (
            <p className="empty-inline">
              All tasks completed. Time to celebrate!
            </p>
          )}
          <button className="add-task" onClick={onAddTask}>
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
          <BudgetChart
            categories={state.categories}
            currency={state.currency}
            contingency={state.contingency}
          />
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
                {i === 0 ? <Lightbulb size={20} /> : <Leaf size={20} />}
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
                <Badge color={v.status === "Booked" ? "green" : "amber"}>
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
            <Badge color="amber">{state.risks.length} insights</Badge>
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
  );
}
