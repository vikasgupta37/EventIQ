import { AppError } from "../auth";

/** Bounded, best-effort controls for one warm instance; not a global quota. */
export class PublicRequestGate {
  private counts = new Map<string, number>();
  private window = -1;
  private active = new Map<string, number>();
  private total = 0;

  count(ip: string, now = Date.now()) {
    const window = Math.floor(now / 60_000);
    if (this.window !== window) {
      this.counts.clear();
      this.window = window;
    }
    const count = this.counts.get(ip) ?? 0;
    if (count >= 10)
      throw new AppError(
        429,
        "Demo request limit reached. Please wait a minute.",
      );
    if (!count && this.counts.size >= 10_000)
      throw new AppError(429, "The demo is busy. Please try again shortly.");
    this.counts.set(ip, count + 1);
  }

  acquire(ip: string) {
    const active = this.active.get(ip) ?? 0;
    if (active >= 2 || this.total >= 4)
      throw new AppError(
        429,
        "The demo is handling other requests. Please try again shortly.",
      );
    this.active.set(ip, active + 1);
    this.total++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const remaining = (this.active.get(ip) ?? 1) - 1;
      if (remaining) this.active.set(ip, remaining);
      else this.active.delete(ip);
      this.total--;
    };
  }
}
