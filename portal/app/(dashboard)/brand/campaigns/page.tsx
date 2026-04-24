import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { getBrandDrops } from "@/lib/queries/brand";
import { formatDate } from "@/lib/utils";
import { requireRole } from "../../role-guard";

export const metadata: Metadata = { title: "Drops" };
export const dynamic = "force-dynamic";

const statusLabel = {
  draft: "Entwurf",
  scheduled: "Geplant",
  live: "Live",
  ended: "Beendet",
} as const;

export default async function BrandCampaignsPage() {
  await requireRole("brand");
  const drops = await getBrandDrops();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Drops"
        description="Deine Sponsored Drops — geplant, live und beendet."
        actions={
          <Button disabled title="Create-Wizard folgt in Phase 1 Skeleton">
            <Megaphone className="mr-2 h-4 w-4" /> Neues Drop
          </Button>
        }
      />

      {drops.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Noch keine Drops"
          description="Sobald du dein erstes Drop planst, findest du hier Performance, Status und Row-Actions."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Alle Drops</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {drops.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <div className="font-medium">{d.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.starts_at ? formatDate(d.starts_at) : "—"}
                      {d.ends_at ? ` · bis ${formatDate(d.ends_at)}` : ""}
                    </div>
                  </div>
                  <Badge variant={d.status === "live" ? "default" : "outline"}>
                    {statusLabel[d.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
