export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
/** Replace this adapter with a verified Auth.js/Clerk session before deployment. */
export async function currentUser() {
  if (process.env.DEMO_MODE !== "true")
    throw new AppError(
      401,
      "Sign-in is not configured. Enable local demo mode or connect an authentication provider.",
    );
  return { id: "demo-user", email: "demo@eventiq.local", name: "Demo Planner" };
}
