import Link from "next/link";
import { browserStorageEnabled } from "@/lib/storage-mode";
import { redirect } from "next/navigation";
import { Sparkles, ShieldCheck } from "lucide-react";
import {
  currentUser,
  demoEnabled,
  googleConfigured,
  AppError,
} from "@/lib/auth";
import SignInButton from "@/components/sign-in";
export const dynamic = "force-dynamic";
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (browserStorageEnabled() || demoEnabled()) redirect("/dashboard");
  const configured = googleConfigured();
  let signedIn = false;
  if (configured) {
    try {
      await currentUser();
      signedIn = true;
    } catch (error) {
      if (!(error instanceof AppError) || error.status !== 401) throw error;
    }
  }
  if (signedIn) redirect("/dashboard");
  const { error } = await searchParams;
  return (
    <main className="create-page">
      <div className="create-toolbar">
        <Link href="/" className="back">
          ← EventIQ home
        </Link>
      </div>
      <div className="create-heading">
        <span className="brand-icon large">
          <Sparkles />
        </span>
        <span className="eyebrow">YOUR NEXT CELEBRATION STARTS HERE</span>
        <h1>
          A little planning.
          <br />A lot to look forward to.
        </h1>
        <p>Sign in to keep your events, guests, and plans together.</p>
      </div>
      <section
        className="create-card signin-card"
        aria-label="Sign in to EventIQ"
      >
        <ShieldCheck size={30} aria-hidden="true" />
        <h2>Your plans. Your workspace.</h2>
        <p>
          Use your Google account to create your own private planning workspace.
        </p>
        {error && (
          <p className="error" role="alert">
            Sign-in could not be completed. Please retry with a verified Google
            account.
          </p>
        )}
        {!configured && (
          <p className="error" role="status">
            Sign-in is being set up. Please check back shortly.
          </p>
        )}
        <SignInButton configured={configured} />
        <p className="muted">
          We use your name and email to identify your account. Google handles
          your password.
        </p>
      </section>
    </main>
  );
}
