import type { Metadata } from "next";
import { Send } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { requireRole } from "../../role-guard";

export const metadata: Metadata = { title: "Seeding" };

export default async function BrandSeedingPage() {
  await requireRole("brand");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Seeding"
        description="Direkt posten oder Influencer anfragen."
      />
      <EmptyState
        icon={Send}
        title="Seeding in Vorbereitung"
        description="Hier wirst du bald Posts direkt in Communities seeden und gezielt Influencer für Kooperationen anfragen können."
      />
    </div>
  );
}
