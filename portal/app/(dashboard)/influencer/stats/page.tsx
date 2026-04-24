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
        title="Noch keine Stats"
        description="Klicks pro Woche, Top-Communities und Audience-Insights siehst du hier, sobald deine Empfehlungen Reichweite bekommen."
      />
    </div>
  );
}
