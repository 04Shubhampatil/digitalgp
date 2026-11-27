import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/AdminShell";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Server-side session guard: no valid `dgp_session` → /login?next=<current path>.
 * An account with a temporary password (just created, or reset by an admin) can only use the profile page, where it
 * sets its own password; every other admin page sends it there until it has done so.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const path = (await headers()).get("x-pathname") ?? "/admin/dashboard";
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (user.user.mustResetPassword && !path.startsWith("/admin/profile")) redirect("/admin/profile");
  return <AdminShell user={user}>{children}</AdminShell>;
}
