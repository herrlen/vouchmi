import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { requireRole } from "../../role-guard";

export const metadata: Metadata = { title: "Empfehlungen" };

export default async function InfluencerRecommendationsPage() {
  await requireRole("influencer");
  return (
    <div className="space-y-6">
      <PageHeader title="Empfehlungen" description="Deine geteilten Recommendations." />
      <EmptyState
        icon={MessageSquare}
        title="Empfehlungen folgen"
        description="Diese Liste nutzt /api/user/posts und /api/v1/analytics/links für Performance."
      />
    </div>
  );
}
