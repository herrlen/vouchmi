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
        title="Feed wird geladen"
        description="Dein Feed zeigt bald Posts der Communities, denen du beigetreten bist. Nutzt /api/feed im Backend."
      />
    </div>
  );
}
