import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/AdminShell";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Server-side session guard: no valid `dgp_session` → /login?next=<current path>. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    const path = (await headers()).get("x-pathname") ?? "/admin/dashboard";
    redirect(`/login?next=${encodeURIComponent(path)}`);
  }
  return <AdminShell user={user}>{children}</AdminShell>;
}
