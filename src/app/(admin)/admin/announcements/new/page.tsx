import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { AdminUnitDto } from "@/types/api";
import { AnnouncementForm, type PublishTargets, type TargetUnit } from "@/components/admin/announcements/AnnouncementForm";
import { hierarchy, LEVEL_ORDER } from "@/lib/api/admin";
import { cookieHeader } from "@/lib/api/server";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "New announcement" };

const toTarget = (u: AdminUnitDto): TargetUnit => ({ id: u.id, nameEn: u.nameEn, nameMr: u.nameMr, path: u.path });

/**
 * Figma "Publish Announcement". Callers who may share downward (block, taluka and district admins) publish from their
 * own area to the Gram Panchayat websites they tick; everyone else writes an announcement for one website.
 */
export default async function NewAnnouncementPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasCapability(user, "content:edit") && !hasCapability(user, "content:share")) redirect("/admin/announcements");
  const cookie = await cookieHeader();

  let targets: PublishTargets | null = null;
  if (hasCapability(user, "content:share")) {
    // The widest non-GP area the caller is assigned to is the owner of the shared announcement.
    const owner = user.assignments
      .filter((a) => !a.revokedAt && a.unitLevel !== "GRAM_PANCHAYAT")
      .sort((a, b) => LEVEL_ORDER.indexOf(a.unitLevel) - LEVEL_ORDER.indexOf(b.unitLevel))[0];
    if (owner) {
      const [gpPage, talukas, blocks] = await Promise.all([
        hierarchy.list({ level: "GRAM_PANCHAYAT", limit: 100 }, { cookie }).catch(() => ({ data: [] as AdminUnitDto[] })),
        hierarchy.list({ level: "TALUKA", limit: 100 }, { cookie }).catch(() => ({ data: [] as AdminUnitDto[] })),
        hierarchy.list({ level: "BLOCK", limit: 100 }, { cookie }).catch(() => ({ data: [] as AdminUnitDto[] })),
      ]);
      const inside = (u: AdminUnitDto) => u.id !== owner.unitId && u.path.includes(`/${owner.unitId}/`);
      const below = [...talukas.data, ...blocks.data].filter(inside);
      // Group by the shallowest area level inside the owner (talukas for a district, blocks for a taluka).
      const level = LEVEL_ORDER.find((l) => below.some((u) => u.level === l));
      const groups = below.filter((u) => u.level === level);
      targets = {
        ownerId: owner.unitId,
        ownerNameEn: owner.unitNameEn,
        groups: groups.map(toTarget),
        gps: gpPage.data.filter((g) => g.tenantId && g.path.includes(`/${owner.unitId}/`)).map(toTarget),
      };
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <AnnouncementForm assignments={user.assignments} capabilities={user.capabilities} targets={targets} />
    </div>
  );
}
