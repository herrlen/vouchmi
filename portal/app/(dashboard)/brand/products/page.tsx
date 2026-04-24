import type { Metadata } from "next";
import { Box } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { requireRole } from "../../role-guard";

export const metadata: Metadata = { title: "Produkte" };

export default async function BrandProductsPage() {
  await requireRole("brand");
  return (
    <div className="space-y-6">
      <PageHeader title="Produkte" description="Dein Produkt-Katalog für Drops und Seeding." />
      <EmptyState
        icon={Box}
        title="Produkte folgen"
        description="Hier findest du später Produktkatalog, Create/Edit-Dialog und optionalen CSV-Import. Backend-Endpoints für Brand-Products sind noch offen — siehe BACKEND-TODO.md."
      />
    </div>
  );
}
