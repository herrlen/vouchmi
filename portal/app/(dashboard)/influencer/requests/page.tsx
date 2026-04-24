import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { requireRole } from "../../role-guard";

export const metadata: Metadata = { title: "Anfragen" };

export default async function InfluencerRequestsPage() {
  await requireRole("influencer");
  return (
    <div className="space-y-6">
      <PageHeader title="Anfragen" description="Brand-Outreach-Inbox." />
      <EmptyState
        icon={Inbox}
        title="Keine offenen Anfragen"
        description="Wenn Marken dich für eine Kooperation anfragen, erscheinen die Anfragen hier zum Annehmen oder Ablehnen."
      />
    </div>
  );
}
