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
        title="Communities entdecken"
        description="Community-Suche und Beitreten folgt in Kürze für Desktop. Für jetzt: nutze die Mobile-App, um Communities zu durchstöbern und beizutreten — sie erscheinen hier dann automatisch."
      />
    </div>
  );
}
