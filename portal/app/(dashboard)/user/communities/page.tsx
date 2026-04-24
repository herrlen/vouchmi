import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { requireRole } from "../../role-guard";

export const metadata: Metadata = { title: "Communities" };

export default async function UserCommunitiesPage() {
  await requireRole("user");
  return (
    <div className="space-y-6">
      <PageHeader title="Communities" description="Entdecke, tritt bei und verwalte deine Mitgliedschaften." />
      <EmptyState
        icon={Compass}
        title="Community-Browser folgt"
        description="Nutzt /api/communities/discover für die Liste und /api/communities/:id/join für Join/Leave."
      />
    </div>
  );
}
