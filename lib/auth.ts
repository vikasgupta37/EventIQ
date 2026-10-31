export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function demoEnabled() {
  return process.env.DEMO_MODE === "true" && process.env.VERCEL !== "1";
}
export function googleConfigured() {
  return Boolean(
    process.env.NEXTAUTH_SECRET &&
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET,
  );
}
export async function currentUser() {
  if (demoEnabled())
    return {
      id: "demo-user",
      email: "demo@eventiq.local",
      name: "Demo Planner",
    };
  if (!googleConfigured())
    throw new AppError(
      401,
      "Sign-in is not configured. Please contact the site owner.",
    );
  const [{ getServerSession }, { authOptions }] = await Promise.all([
    import("next-auth"),
    import("./auth-options"),
  ]);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id?.startsWith("google:") || !session.user.email)
    throw new AppError(401, "Please sign in to continue.");
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name || "Event Planner",
  };
}
