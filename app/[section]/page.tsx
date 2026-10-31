import Workspace from "@/components/workspace";
import { browserStorageEnabled } from "@/lib/storage-mode";
import { requireUser } from "@/lib/require-user";
import { demoEnabled } from "@/lib/auth";
import { notFound } from "next/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (
    ![
      "dashboard",
      "planner",
      "budget",
      "timeline",
      "tasks",
      "vendors",
      "ideas",
      "risks",
      "guests",
      "expenses",
      "history",
    ].includes(section)
  )
    notFound();
  if (browserStorageEnabled())
    return (
      <Workspace
        key={section}
        section={section}
        account={{
          name: "Demo Planner",
          email: "Saved in this browser",
          demo: true,
          browser: true,
        }}
      />
    );
  const user = await requireUser();
  return (
    <Workspace
      key={section}
      section={section}
      account={{ name: user.name, email: user.email, demo: demoEnabled() }}
    />
  );
}
