import type { EventInput } from "./validation";

/** Example briefs only: the user reviews them before creating an event. */
export function eventExample(
  type: "Wedding" | "Birthday",
  now = new Date(),
): EventInput {
  const wedding = type === "Wedding";
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() + (wedding ? 180 : 60));
  return {
    name: wedding ? "Delhi Modern Wedding" : "Garden Birthday Celebration",
    eventType: type,
    date: date.toISOString().slice(0, 10),
    location: wedding ? "Delhi" : "Bengaluru",
    guestCount: wedding ? 250 : 40,
    budget: wedding ? 1200000 : 150000,
    currency: "INR",
    theme: wedding ? "Modern elegance" : "Garden party",
    preferences: wedding
      ? ["Vegetarian menu", "Digital invitations"]
      : ["Birthday cake", "Outdoor games", "Family friendly"],
    priorities: wedding
      ? ["Photography", "Catering"]
      : ["Catering", "Entertainment"],
    sustainable: !wedding,
    venueCapacity: null,
  };
}
