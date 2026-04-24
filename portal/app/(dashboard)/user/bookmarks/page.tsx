import type { Metadata } from "next";
import { Bookmark } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { requireRole } from "../../role-guard";

export const metadata: Metadata = { title: "Bookmarks" };

export default async function UserBookmarksPage() {
  await requireRole("user");
  return (
    <div className="space-y-6">
      <PageHeader title="Bookmarks" description="Deine gespeicherten Posts." />
      <EmptyState
        icon={Bookmark}
        title="Keine Bookmarks bisher"
        description="Speichere Posts in der Mobile-App oder im Feed — sie erscheinen dann hier zum erneuten Aufrufen."
      />
    </div>
  );
}
