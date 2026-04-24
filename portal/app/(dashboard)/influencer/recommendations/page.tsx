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
        title="Noch keine Empfehlungen"
        description="Sobald du in der Mobile-App Empfehlungen teilst, siehst du hier die Liste mit Klicks, Conversions und Top-Performing-Posts."
      />
    </div>
  );
}
