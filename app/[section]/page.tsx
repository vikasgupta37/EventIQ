import Workspace from "@/components/workspace";
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
  return <Workspace key={section} section={section} />;
}
