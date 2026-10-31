"use client";
import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { MoreHorizontal } from "lucide-react";
export type WorkspaceAccount = { name: string; email: string; demo: boolean };
export default function AccountMenu({
  account,
}: {
  account: WorkspaceAccount;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const initials = account.name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
  return (
    <>
      <button
        className="user-button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="avatar">{initials}</span>
        <span>
          <b>{account.name}</b>
          <small>Personal workspace</small>
        </span>
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className="profile-popover">
          <b>
            {account.demo ? "Local demo workspace" : "Signed in with Google"}
          </b>
          <p>{account.email}</p>
          <Link href="/">Visit EventIQ home</Link>
          {!account.demo && (
            <button
              className="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  try {
                    localStorage.removeItem("eventiq-event");
                  } catch {
                    /* Storage may be blocked. */
                  }
                  await signOut({ callbackUrl: "/signin" });
                } catch {
                  setError("Sign-out failed. Please try again.");
                  setBusy(false);
                }
              }}
            >
              {busy ? "Signing out…" : "Sign out"}
            </button>
          )}
          {error && <p role="alert">{error}</p>}
        </div>
      )}
    </>
  );
}
