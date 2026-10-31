import "dotenv/config";
import { db } from "../lib/db/client";
import { createEvent } from "../lib/db/events";
const user = {
  id: "demo-user",
  email: "demo@eventiq.local",
  name: "Demo Planner",
};
await db.user.upsert({ where: { id: user.id }, create: user, update: {} });
if (!(await db.event.findFirst({ where: { userId: user.id } }))) {
  const event = await createEvent(
    {
      name: "Delhi Modern Wedding",
      eventType: "Wedding",
      date: "2027-02-14",
      location: "Delhi, India",
      guestCount: 250,
      budget: 1200000,
      currency: "INR",
      theme: "Modern elegance",
      preferences: ["Great food", "Memorable guest experience"],
      priorities: ["Photography", "Catering", "Guest experience"],
      sustainable: false,
      venueCapacity: null,
    },
    user.id,
  );
  console.log(`Seeded ${event.name} (${event.id})`);
} else console.log("Demo event already exists; preserved existing data.");
await db.$disconnect();
