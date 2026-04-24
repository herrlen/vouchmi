import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { requireRole } from "../../role-guard";

export const metadata: Metadata = { title: "Analytics" };

export default async function BrandAnalyticsPage() {
  await requireRole("brand");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Drops, Posts, Communities und Influencer im Überblick."
      />
      <EmptyState
        icon={BarChart3}
        title="Analytics bald verfügbar"
        description="Diese Ansicht liest die Endpoints /api/brand/analytics/*. Sobald die Drops und Posts Daten haben, erscheinen hier Charts, Filter und CSV-Export."
      />
    </div>
  );
}
