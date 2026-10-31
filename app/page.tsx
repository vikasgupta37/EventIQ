import Link from "next/link";
import AppearanceSelect from "@/components/appearance";
import {
  ArrowUpRight,
  Sparkles,
  CalendarDays,
  Wallet,
  ListChecks,
  Store,
  Lightbulb,
  ShieldCheck,
  ArrowRight,
  Check,
} from "lucide-react";
export default function Home() {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <Link href="/" className="brand">
          <span className="brand-icon">
            <Sparkles size={22} />
          </span>
          Event<span>IQ</span>
        </Link>
        <div>
          <AppearanceSelect />
          <a href="#how">How it works</a>
          <a href="#features">What’s inside</a>
          <Link href="/dashboard" className="button small">
            Open workspace <ArrowUpRight size={16} />
          </Link>
        </div>
      </nav>
      <main>
        <section className="hero">
          <div className="eyebrow">
            <span className="live-dot" /> A LITTLE INTELLIGENCE. A LOT TO
            CELEBRATE.
          </div>
          <h1>
            Plan smarter.
            <br />
            <span>Celebrate better.</span>
          </h1>
          <p>
            Big ideas deserve a brilliant plan. Meet your AI event planning
            partner — bringing your budget, people and every little detail
            together.
          </p>
          <div className="hero-actions">
            <Link href="/events/new" className="button">
              Create Your Event <ArrowRight size={18} />
            </Link>
            <Link href="/dashboard" className="button secondary">
              Try AI Planner <Sparkles size={18} />
            </Link>
          </div>
          <div className="hero-note">
            <Check size={15} /> One thoughtful workspace <span>·</span> From the
            first idea to the final toast
          </div>
          <div className="hero-preview">
            <div className="preview-sidebar">
              <span className="brand">✦ EventIQ</span>
              <span className="selected">Overview</span>
              <span>AI Planner</span>
              <span>Budget & tasks</span>
              <span>Your celebration</span>
            </div>
            <div className="preview-body">
              <div className="eyebrow">YOUR NEXT GREAT MEMORY</div>
              <h2>A celebration, coming together.</h2>
              <div className="preview-stats">
                <div>
                  <small>THE VISION</small>
                  <strong>Uniquely yours</strong>
                </div>
                <div>
                  <small>THE DETAILS</small>
                  <strong>All connected</strong>
                </div>
                <div>
                  <small>THE FEELING</small>
                  <strong>Under control</strong>
                </div>
              </div>
              <div className="preview-plan">
                <Sparkles />
                <div>
                  <b>A plan that moves with you.</b>
                  <p>
                    More guests? A new budget? Your planner connects the dots
                    and updates the details.
                  </p>
                </div>
                <span className="badge green">Always in sync</span>
              </div>
            </div>
          </div>
        </section>
        <section id="how" className="how">
          <span className="eyebrow">LESS OVERWHELM. MORE POSSIBILITY.</span>
          <h2>From “what if” to “what a day.”</h2>
          <div>
            {["Describe", "Plan", "Optimize", "Celebrate"].map((t, i) => (
              <article key={t}>
                <span>0{i + 1}</span>
                <h3>{t}</h3>
                <p>
                  {
                    [
                      "Tell us what you’re dreaming of.",
                      "Get a clear, actionable event plan.",
                      "Adjust the details as life happens.",
                      "Be present for the moments that matter.",
                    ][i]
                  }
                </p>
              </article>
            ))}
          </div>
        </section>
        <section id="features" className="features">
          {[
            [
              Sparkles,
              "AI Event Planner",
              "An intelligent partner that acts on your plan.",
            ],
            [
              Wallet,
              "Smart Budgeting",
              "A clear view of every allocation and estimate.",
            ],
            [
              CalendarDays,
              "Dynamic Timeline",
              "The right next step, at the right time.",
            ],
            [
              Store,
              "Vendor Checklist",
              "Keep every service and booking organized.",
            ],
            [
              Lightbulb,
              "Personalized Ideas",
              "Thoughtful touches made for your celebration.",
            ],
            [
              ShieldCheck,
              "Risk Detection",
              "Spot the details that need attention early.",
            ],
          ].map(([Icon, title, description]) => {
            const I = Icon as typeof ListChecks;
            return (
              <article key={String(title)}>
                <I />
                <h3>{String(title)}</h3>
                <p>{String(description)}</p>
              </article>
            );
          })}
        </section>
      </main>
      <footer>
        <span className="brand">EventIQ</span>
        <span>Smarter Planning. Better Celebrations.</span>
        <Link href="/events/new">
          Start something memorable <ArrowUpRight size={16} />
        </Link>
      </footer>
    </div>
  );
}
