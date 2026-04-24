import type { Metadata } from "next";
import { BarChart3, Gauge, MessageSquare } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { apiMaybe } from "@/lib/api";
import { requireRole } from "../role-guard";

export const metadata: Metadata = { title: "Influencer Übersicht" };
export const dynamic = "force-dynamic";

type InfluencerOverview = {
  recommendations: number;
  clicks: number;
  discovery_score: number;
};

export default async function InfluencerOverviewPage() {
  const user = await requireRole("influencer");
  const overview = await apiMaybe<InfluencerOverview>("/api/v1/analytics/overview", {
    cache: "no-store",
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hi ${user.display_name ?? user.username}`}
        description="Deine Performance auf einen Blick."
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Empfehlungen"
          value={overview?.recommendations ?? 0}
          icon={MessageSquare}
          tone="social"
        />
        <KpiCard
          label="Klicks"
          value={overview?.clicks ?? 0}
          icon={BarChart3}
          tone="accent"
        />
        <KpiCard
          label="Discovery-Score"
          value={overview?.discovery_score ?? 0}
          icon={Gauge}
          tone="primary"
        />
      </section>
    </div>
  );
}
