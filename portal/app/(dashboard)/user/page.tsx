import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { requireRole } from "../role-guard";

export const metadata: Metadata = { title: "Feed" };

export default async function UserFeedPage() {
  const user = await requireRole("user");
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Willkommen, ${user.display_name ?? user.username}`}
        description="Posts aus deinen Communities."
      />
      <EmptyState
        icon={Sparkles}
        title="Dein Feed ist noch leer"
        description="Tritt Communities bei, um Empfehlungen und Posts zu sehen. Oder öffne die Mobile-App und erstelle deinen ersten Post."
      />
    </div>
  );
}
