import CreateEvent from "@/components/create-event";
import { browserStorageEnabled } from "@/lib/storage-mode";
import { requireUser } from "@/lib/require-user";
export default async function Page() {
  if (!browserStorageEnabled()) await requireUser();
  return <CreateEvent />;
}
