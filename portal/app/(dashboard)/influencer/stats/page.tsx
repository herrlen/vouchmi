import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { requireRole } from "../../role-guard";

export const metadata: Metadata = { title: "Stats" };

export default async function InfluencerStatsPage() {
  await requireRole("influencer");
  return (
    <div className="space-y-6">
      <PageHeader title="Stats" description="Klicks pro Woche und Top-Posts." />
      <EmptyState
        icon={BarChart3}
        title="Charts folgen"
        description="Nutzt /api/v1/analytics/links und /api/v1/analytics/audience (Influencer-Abo erforderlich)."
      />
    </div>
  );
}
