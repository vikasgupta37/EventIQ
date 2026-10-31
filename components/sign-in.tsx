"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
export default function SignInButton({ configured }: { configured: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <button
        className="button"
        disabled={!configured || busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await signIn("google", { callbackUrl: "/dashboard" });
          } catch {
            setError("Unable to open Google sign-in. Please try again.");
            setBusy(false);
          }
        }}
      >
        {busy ? "Opening Google…" : "Continue with Google"}
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
