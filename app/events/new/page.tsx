import CreateEvent from "@/components/create-event";
import { requireUser } from "@/lib/require-user";
export default async function Page() {
  await requireUser();
  return <CreateEvent />;
}
