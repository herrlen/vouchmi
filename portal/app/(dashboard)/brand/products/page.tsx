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
        title="Produktkatalog folgt"
        description="Lege deine Produkte mit Affiliate-Link und Bild an, verwalte Kategorien und importiere per CSV. Aktuell in Vorbereitung."
      />
    </div>
  );
}
