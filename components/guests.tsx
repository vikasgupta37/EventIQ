"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Users, Check } from "lucide-react";
import { api } from "./api";
import { guestSummary, type Guest, type GuestInput } from "@/lib/management";
import type { EventState } from "@/lib/types";
const blank: GuestInput = {
  name: "",
  email: "",
  phone: "",
  rsvp: "Pending",
  plusOnes: 0,
  dietary: "",
  tableName: "",
  notes: "",
};
export default function Guests({
  state,
  onState,
}: {
  state: EventState;
  onState: (s: EventState) => void;
}) {
  const [rows, setRows] = useState<Guest[]>([]);
  const [editor, setEditor] = useState<(GuestInput & { id?: string }) | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    api<Guest[]>(`events/${state.id}/guests`)
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
      const [guests, event] = await Promise.all([
        api<Guest[]>(`events/${state.id}/guests`),
        api<EventState>(`events/${state.id}`),
      ]);
      setRows(guests);
      onState(event);
      setEditor(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const totals = guestSummary(rows);
  const filtered = rows.filter(
    (g) =>
      (filter === "All" || g.rsvp === filter) &&
      [g.name, g.email, g.dietary, g.tableName]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="budget-summary">
        {Object.entries(totals).map(([label, n]) => (
          <div className="card" key={label}>
            <small>{label[0].toUpperCase() + label.slice(1)} people</small>
            <strong>{n}</strong>
          </div>
        ))}
      </div>
      <div className="notice">
        <Users size={19} />
        <div>
          <b>{state.guestCount} guests in your planning assumptions</b>
          <p>
            The guest list includes plus-ones. RSVP updates do not automatically
            change your planning headcount.
          </p>
          <button
            className="text-button"
            disabled={
              busy ||
              totals.confirmed === 0 ||
              totals.confirmed === state.guestCount
            }
            onClick={() => {
              if (
                confirm(
                  `Use ${totals.confirmed} confirmed people as the planning headcount and recalculate the plan?`,
                )
              )
                void action(`events/${state.id}`, "PATCH", {
                  guestCount: totals.confirmed,
                });
            }}
          >
            Use confirmed count in plan <Check size={14} />
          </button>
        </div>
      </div>
      <section className="card">
        <div className="card-heading">
          <div className="filters">
            <input
              aria-label="Search guests"
              placeholder="Search name, dietary needs or table…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              aria-label="Filter RSVP"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              {["All", "Pending", "Accepted", "Declined"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <button
            className="button small"
            onClick={() => setEditor({ ...blank })}
          >
            <Plus size={15} /> Add guest
          </button>
        </div>
        <p className="muted">
          Track responses you receive, dietary needs and seating. No invitations
          or messages are sent automatically.
        </p>
        {loading ? (
          <p className="empty-inline">Loading guest list…</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Guest & contact</th>
                  <th>RSVP</th>
                  <th>Party size</th>
                  <th>Dietary & seating</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <b>{g.name}</b>
                      <small>
                        {[g.email, g.phone].filter(Boolean).join(" · ") ||
                          "No contact details"}
                      </small>
                    </td>
                    <td>
                      <span
                        className={`badge ${g.rsvp === "Accepted" ? "green" : g.rsvp === "Declined" ? "red" : "amber"}`}
                      >
                        {g.rsvp}
                      </span>
                    </td>
                    <td>{1 + g.plusOnes}</td>
                    <td>
                      {g.dietary || "Not specified"}
                      <small>{g.tableName || "Table unassigned"}</small>
                    </td>
                    <td>
                      <button
                        aria-label={`Edit ${g.name}`}
                        className="icon-button"
                        onClick={() => setEditor(g)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        aria-label={`Delete ${g.name}`}
                        className="icon-button"
                        disabled={busy}
                        onClick={() => {
                          if (confirm(`Delete ${g.name} from this guest list?`))
                            void action(
                              `events/${state.id}/guests/${g.id}`,
                              "DELETE",
                            );
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <p className="empty-inline">
                {rows.length
                  ? "No guests match your filters."
                  : "Your guest list starts here. Add your first guest."}
              </p>
            )}
          </div>
        )}
      </section>
      {editor && (
        <section className="card record-editor" aria-labelledby="guest-editor">
          <div className="card-heading">
            <h2 id="guest-editor">{editor.id ? "Edit guest" : "New guest"}</h2>
            <button className="text-button" onClick={() => setEditor(null)}>
              Cancel
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const { id } = editor;
              const input = Object.fromEntries(
                Object.keys(blank).map((k) => [
                  k,
                  editor[k as keyof GuestInput],
                ]),
              );
              void action(
                `events/${state.id}/guests${id ? `/${id}` : ""}`,
                id ? "PATCH" : "POST",
                input,
              );
            }}
          >
            <div className="form-grid">
              <label>
                Guest name
                <input
                  autoFocus
                  required
                  value={editor.name}
                  onChange={(e) =>
                    setEditor({ ...editor, name: e.target.value })
                  }
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={editor.email}
                  onChange={(e) =>
                    setEditor({ ...editor, email: e.target.value })
                  }
                />
              </label>
              <label>
                Phone
                <input
                  value={editor.phone}
                  onChange={(e) =>
                    setEditor({ ...editor, phone: e.target.value })
                  }
                />
              </label>
              <label>
                RSVP
                <select
                  value={editor.rsvp}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      rsvp: e.target.value as Guest["rsvp"],
                    })
                  }
                >
                  {["Pending", "Accepted", "Declined"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Plus-ones
                <input
                  type="number"
                  min={0}
                  max={10}
                  required
                  value={editor.plusOnes}
                  onChange={(e) =>
                    setEditor({ ...editor, plusOnes: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Table or seating group
                <input
                  value={editor.tableName}
                  onChange={(e) =>
                    setEditor({ ...editor, tableName: e.target.value })
                  }
                />
              </label>
              <label>
                Dietary preferences
                <input
                  value={editor.dietary}
                  onChange={(e) =>
                    setEditor({ ...editor, dietary: e.target.value })
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
              {busy ? "Saving…" : "Save guest"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
