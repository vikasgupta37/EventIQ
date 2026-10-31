"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Wallet } from "lucide-react";
import { api } from "./api";
import {
  expenseSummary,
  type Expense,
  type ExpenseInput,
} from "@/lib/management";
import { money, today } from "@/lib/engines";
import type { EventState } from "@/lib/types";
const blank: ExpenseInput = {
  title: "",
  category: "Venue",
  supplier: "",
  amount: 1,
  status: "Quoted",
  dueDate: null,
  notes: "",
};
export default function Expenses({
  state,
  onState,
}: {
  state: EventState;
  onState: (s: EventState) => void;
}) {
  const [rows, setRows] = useState<Expense[]>([]);
  const [editor, setEditor] = useState<(ExpenseInput & { id?: string }) | null>(
    null,
  );
  const [payment, setPayment] = useState<{
    expenseId: string;
    amount: number;
    paidOn: string;
    reference: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  useEffect(() => {
    let active = true;
    api<Expense[]>(`events/${state.id}/expenses`)
      .then((r) => {
        if (active) {
          setRows(r);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [state.id]);
  async function action(path: string, method: string, body?: unknown) {
    setBusy(true);
    setError("");
    try {
      await api(path, method, body);
      const [expenses, event] = await Promise.all([
        api<Expense[]>(`events/${state.id}/expenses`),
        api<EventState>(`events/${state.id}`),
      ]);
      setRows(expenses);
      onState(event);
      setEditor(null);
      setPayment(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const totals = expenseSummary(rows);
  const fmt = (n: number) => money(n, state.currency);
  return (
    <div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="budget-summary">
        {[
          ["Quotes", totals.quoted],
          ["Confirmed commitments", totals.committed],
          ["Recorded payments", totals.paid],
          ["Outstanding balance", totals.outstanding],
        ].map(([label, n]) => (
          <article className="card" key={label}>
            <small>{label}</small>
            <strong>{fmt(Number(n))}</strong>
          </article>
        ))}
      </div>
      <div className="notice">
        <Wallet size={20} />
        <div>
          <b>
            {fmt(state.budget - totals.committed)} of your budget is not yet
            committed
          </b>
          <p>
            Based only on recorded confirmed expenses. Quotes and AI estimates
            are separate. Recording a payment does not transfer money or mark a
            vendor booked.
          </p>
        </div>
      </div>
      <section className="card">
        <div className="card-heading">
          <h2>Quotes, deposits & payments</h2>
          <div className="filters">
            <select
              aria-label="Filter expenses"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              {["All", "Quoted", "Confirmed"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <button
              className="button small"
              onClick={() => {
                setEditor({ ...blank });
                setPayment(null);
              }}
            >
              <Plus size={15} /> Add expense
            </button>
          </div>
        </div>
        {loading ? (
          <p className="empty-inline">Loading expenses…</p>
        ) : (
          <div className="expense-list">
            {rows
              .filter((e) => filter === "All" || e.status === filter)
              .map((e) => {
                const paid = e.payments.reduce((s, p) => s + p.amount, 0);
                const remaining = e.amount - paid;
                return (
                  <article className="expense-row" key={e.id}>
                    <div className="expense-top">
                      <div>
                        <span
                          className={`badge ${e.status === "Confirmed" ? "green" : "amber"}`}
                        >
                          {e.status}
                        </span>
                        <h3>{e.title}</h3>
                        <p className="muted">
                          {e.category} ·{" "}
                          {e.supplier || "Supplier not specified"}
                        </p>
                      </div>
                      <div className="expense-amount">
                        <b>{fmt(e.amount)}</b>
                        <small>
                          {fmt(paid)} paid · {fmt(remaining)} balance
                        </small>
                        {e.dueDate && (
                          <small
                            className={
                              remaining > 0 &&
                              e.status === "Confirmed" &&
                              e.dueDate < today()
                                ? "negative"
                                : ""
                            }
                          >
                            Due {e.dueDate}
                            {remaining > 0 &&
                            e.status === "Confirmed" &&
                            e.dueDate < today()
                              ? " · Overdue"
                              : ""}
                          </small>
                        )}
                      </div>
                      <button
                        className="icon-button"
                        aria-label={`Edit ${e.title}`}
                        onClick={() => {
                          setEditor(e);
                          setPayment(null);
                        }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Delete ${e.title}`}
                        disabled={busy}
                        onClick={() => {
                          if (
                            confirm(
                              `Delete “${e.title}” and its recorded payment history? This does not cancel any real payment.`,
                            )
                          )
                            void action(
                              `events/${state.id}/expenses/${e.id}`,
                              "DELETE",
                            );
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    {e.notes && <p className="muted">{e.notes}</p>}
                    <div className="expense-actions">
                      <button
                        className="text-button"
                        disabled={
                          busy || e.status !== "Confirmed" || remaining <= 0
                        }
                        onClick={() => {
                          setPayment({
                            expenseId: e.id,
                            amount: remaining,
                            paidOn: today(),
                            reference: "",
                          });
                          setEditor(null);
                        }}
                      >
                        Record payment <Plus size={14} />
                      </button>
                      {e.status === "Quoted" && (
                        <span className="muted">
                          Edit and confirm this expense before recording
                          payments.
                        </span>
                      )}
                    </div>
                    {e.payments.length > 0 && (
                      <details>
                        <summary>
                          {e.payments.length} recorded payment
                          {e.payments.length === 1 ? "" : "s"}
                        </summary>
                        {e.payments.map((p) => (
                          <div className="payment-row" key={p.id}>
                            <span>
                              {p.paidOn} · {p.reference || "No reference"}
                            </span>
                            <b>{fmt(p.amount)}</b>
                            <button
                              className="icon-button"
                              aria-label={`Remove payment ${p.reference || p.paidOn}`}
                              disabled={busy}
                              onClick={() => {
                                if (
                                  confirm(
                                    "Remove this payment record to correct the ledger? No money will be refunded.",
                                  )
                                )
                                  void action(
                                    `events/${state.id}/expenses/${e.id}/payments/${p.id}`,
                                    "DELETE",
                                  );
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </details>
                    )}
                  </article>
                );
              })}
            {!rows.some((e) => filter === "All" || e.status === filter) && (
              <p className="empty-inline">
                No expenses here yet. Add a quote or confirmed expense to start
                tracking.
              </p>
            )}
          </div>
        )}
      </section>
      {editor && (
        <section className="card record-editor">
          <div className="card-heading">
            <h2>{editor.id ? "Edit expense" : "New expense"}</h2>
            <button className="text-button" onClick={() => setEditor(null)}>
              Cancel
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = Object.fromEntries(
                Object.keys(blank).map((k) => [
                  k,
                  editor[k as keyof ExpenseInput],
                ]),
              );
              void action(
                `events/${state.id}/expenses${editor.id ? `/${editor.id}` : ""}`,
                editor.id ? "PATCH" : "POST",
                input,
              );
            }}
          >
            <div className="form-grid">
              <label>
                Expense title
                <input
                  autoFocus
                  required
                  value={editor.title}
                  onChange={(e) =>
                    setEditor({ ...editor, title: e.target.value })
                  }
                />
              </label>
              <label>
                Supplier
                <input
                  value={editor.supplier}
                  onChange={(e) =>
                    setEditor({ ...editor, supplier: e.target.value })
                  }
                />
              </label>
              <label>
                Category
                <select
                  value={editor.category}
                  onChange={(e) =>
                    setEditor({ ...editor, category: e.target.value })
                  }
                >
                  {state.categories.map((c) => (
                    <option key={c.name}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Total amount ({state.currency}, whole units)
                <input
                  type="number"
                  min={1}
                  max={1000000000}
                  step={1}
                  required
                  value={editor.amount}
                  onChange={(e) =>
                    setEditor({ ...editor, amount: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Expense status
                <select
                  value={editor.status}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      status: e.target.value as ExpenseInput["status"],
                    })
                  }
                >
                  <option>Quoted</option>
                  <option>Confirmed</option>
                </select>
              </label>
              <label>
                Payment due date
                <input
                  type="date"
                  value={editor.dueDate ?? ""}
                  onChange={(e) =>
                    setEditor({ ...editor, dueDate: e.target.value || null })
                  }
                />
              </label>
              <label>
                Notes
                <textarea
                  value={editor.notes}
                  onChange={(e) =>
                    setEditor({ ...editor, notes: e.target.value })
                  }
                />
              </label>
            </div>
            <button className="button" disabled={busy}>
              {busy ? "Saving…" : "Save expense"}
            </button>
          </form>
        </section>
      )}
      {payment && (
        <section className="card record-editor">
          <div className="card-heading">
            <h2>
              Record a payment ·{" "}
              {rows.find((e) => e.id === payment.expenseId)?.title}
            </h2>
            <button className="text-button" onClick={() => setPayment(null)}>
              Cancel
            </button>
          </div>
          <p className="muted">
            Record a payment you have already made. This form does not send
            money.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const { expenseId, ...input } = payment;
              void action(
                `events/${state.id}/expenses/${expenseId}/payments`,
                "POST",
                input,
              );
            }}
          >
            <div className="form-grid">
              <label>
                Payment amount ({state.currency})
                <input
                  autoFocus
                  required
                  type="number"
                  min={1}
                  step={1}
                  value={payment.amount}
                  onChange={(e) =>
                    setPayment({ ...payment, amount: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Payment date
                <input
                  required
                  type="date"
                  max={today()}
                  value={payment.paidOn}
                  onChange={(e) =>
                    setPayment({ ...payment, paidOn: e.target.value })
                  }
                />
              </label>
              <label>
                Reference or deposit note
                <input
                  value={payment.reference}
                  onChange={(e) =>
                    setPayment({ ...payment, reference: e.target.value })
                  }
                />
              </label>
            </div>
            <button className="button" disabled={busy}>
              {busy ? "Saving…" : "Save payment record"}
            </button>
          </form>
        </section>
      )}
      <section className="card record-editor">
        <div className="card-heading">
          <h2>Estimates vs. recorded expenses</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>AI estimate</th>
                <th>Confirmed</th>
                <th>Paid</th>
              </tr>
            </thead>
            <tbody>
              {state.categories.map((c) => {
                const matching = rows.filter(
                  (e) => e.category === c.name && e.status === "Confirmed",
                );
                return (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{fmt(c.estimated)}</td>
                    <td>{fmt(matching.reduce((s, e) => s + e.amount, 0))}</td>
                    <td>
                      {fmt(
                        matching.reduce(
                          (s, e) =>
                            s + e.payments.reduce((n, p) => n + p.amount, 0),
                          0,
                        ),
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
