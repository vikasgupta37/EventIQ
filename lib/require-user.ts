import { redirect } from "next/navigation";
import { AppError, currentUser } from "./auth";
export async function requireUser() {
  try {
    return await currentUser();
  } catch (error) {
    if (!(error instanceof AppError) || error.status !== 401) throw error;
  }
  redirect("/signin");
}
