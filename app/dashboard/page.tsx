export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

/** Dashboard index redirects to tickets (attendee default view) */
export default function DashboardPage() {
  redirect("/dashboard/tickets");
}
