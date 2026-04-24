import type { Metadata } from "next";
import { CreditCard } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiMaybe } from "@/lib/api";
import type { SubscriptionStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { requireRole } from "../../role-guard";

export const metadata: Metadata = { title: "Abo" };
export const dynamic = "force-dynamic";

export default async function BrandSubscriptionPage() {
  await requireRole("brand");
  const status = await apiMaybe<SubscriptionStatus>("/api/subscription/status", {
    cache: "no-store",
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Abo"
        description="Status, nächste Abbuchung und Kündigung."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Aktuelles Abo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {status ? (
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Plan</dt>
                <dd className="font-medium">{status.plan_type ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <Badge variant={status.has_active ? "default" : "outline"}>
                    {status.status ?? (status.has_active ? "aktiv" : "inaktiv")}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Anbieter</dt>
                <dd className="font-medium">{status.payment_provider ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Läuft bis</dt>
                <dd className="font-medium">
                  {status.expires_at ? formatDate(status.expires_at) : "—"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              Kein aktives Abo gefunden. Registriere deine Marke, um Drops und Seeding
              freizuschalten.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
