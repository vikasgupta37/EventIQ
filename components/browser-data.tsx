"use client";
import { useRef, useState } from "react";
import { browserStorageEnabled } from "@/lib/storage-mode";
import { exportBrowserData, importBrowserData } from "@/lib/browser-store";
export default function BrowserData() {
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  if (!browserStorageEnabled()) return null;
  return (
    <aside className="browser-storage-note" aria-label="Browser storage">
      <div>
        <strong>Public demo · saved in this browser</strong>
        <p>
          No account or cloud sync. Clearing site data removes your events. AI
          requests send your event plan and recent chat for processing.
        </p>
      </div>
      <div className="browser-data-actions">
        <button
          className="button secondary small"
          onClick={() => {
            try {
              const url = URL.createObjectURL(
                new Blob([exportBrowserData()], { type: "application/json" }),
              );
              const a = document.createElement("a");
              a.href = url;
              a.download = "eventiq-backup.json";
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
              setMessage("Backup exported. Keep it somewhere safe.");
            } catch {
              setMessage("Your browser could not export a backup.");
            }
          }}
        >
          Export backup
        </button>
        <button
          className="button secondary small"
          onClick={() => input.current?.click()}
        >
          Import backup
        </button>
        <input
          hidden
          ref={input}
          type="file"
          accept=".json,application/json"
          aria-label="Import EventIQ backup"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            try {
              if (file.size > 5 * 1024 * 1024)
                throw new Error("Backup exceeds 5 MB.");
              await importBrowserData(await file.text());
              window.location.reload();
            } catch (error) {
              setMessage((error as Error).message);
            }
          }}
        />
      </div>
      {message && <p role="status">{message}</p>}
    </aside>
  );
}
