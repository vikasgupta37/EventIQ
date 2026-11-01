"use client";
import type { EventState } from "@/lib/types";
import type { Mutate } from "./types";
import Dialog from "../ui/dialog";

export default function EventSettings({
  state,
  busy,
  error,
  mutate,
  onClose,
}: {
  state: EventState;
  busy: boolean;
  error: string;
  mutate: Mutate;
  onClose: () => void;
}) {
  return (
    <Dialog
      title={<>Event details</>}
      closeLabel="Close event details"
      onClose={onClose}
    >
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
            onClose();
        }}
      >
        <label>
          Event name
          <input name="name" required defaultValue={state.name} />
        </label>
        <div className="form-grid">
          <label>
            Date
            <input type="date" name="date" required defaultValue={state.date} />
          </label>
          <label>
            Location
            <input name="location" required defaultValue={state.location} />
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
    </Dialog>
  );
}
