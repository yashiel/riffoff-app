import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Dashboard index — middleware handles the redirect to /dashboard/tickets.
 * This is a fallback for direct server-side rendering (e.g., first page load
 * without middleware). Uses redirect() which is safe during full page loads
 * but not during client-side RSC streaming navigation.
 */
export default function DashboardPage() {
  redirect("/dashboard/tickets");
}
