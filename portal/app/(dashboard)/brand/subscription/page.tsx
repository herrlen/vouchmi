import type { Metadata } from "next";
import Link from "next/link";
import { Coins, Info } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiMaybe } from "@/lib/api";
import type { SubscriptionStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { requireRole } from "../../role-guard";

export const metadata: Metadata = { title: "Abo (auslaufend)" };
export const dynamic = "force-dynamic";

export default async function BrandSubscriptionPage() {
  await requireRole("brand");
  const status = await apiMaybe<SubscriptionStatus>("/api/subscription/status", {
    cache: "no-store",
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Abo (auslaufend)"
        description="Brand-Abos werden durch das neue Wallet-System abgelöst. Bestehende Abos laufen wie gewohnt weiter, neue Käufe erfolgen über Credits."
      />

      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4 text-amber-500" />
            Neu: Bewerben statt zahlen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Vouchmi ersetzt monatliche Abos durch ein flexibles Guthaben-System.
            Lade Credits auf und bewerbe gezielt einzelne Empfehlungen — du
            zahlst nur das, was du tatsächlich nutzt.
          </p>
          <Button asChild>
            <Link href="/brand/wallet">
              <Coins className="mr-2 h-4 w-4" /> Zum Wallet
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bestehendes Abo</CardTitle>
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
              Kein aktives Abo. Lade direkt Credits auf, um Empfehlungen zu bewerben.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
