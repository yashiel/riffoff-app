export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

export const metadata = { title: "Profile" };

/** Redirect old profile route to new settings page */
export default function ProfilePage() {
  redirect("/dashboard/settings");
}
