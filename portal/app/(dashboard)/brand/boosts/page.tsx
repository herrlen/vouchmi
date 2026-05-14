import type { Metadata } from "next";
import { Rocket } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiMaybe } from "@/lib/api";
import type { BoostSummary, BoostStatus } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { requireRole } from "../../role-guard";

export const metadata: Metadata = { title: "Boosts" };
export const dynamic = "force-dynamic";

export default async function BrandBoostsPage() {
  await requireRole("brand");
  const data = await apiMaybe<{ boosts: BoostSummary[] }>("/api/v1/boosts/mine", {
    cache: "no-store",
  });
  const boosts = data?.boosts ?? [];

  const active = boosts.filter((b) => b.status === "active");
  const past = boosts.filter((b) => b.status !== "active");

  const totals = boosts.reduce(
    (acc, b) => ({
      credits: acc.credits + b.credits_spent,
      impressions: acc.impressions + b.impressions,
      clicks: acc.clicks + b.clicks,
    }),
    { credits: 0, impressions: 0, clicks: 0 },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Boosts"
        description="Aktive und vergangene Bewerbungen deiner Empfehlungen, mit Performance-Daten."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Gesamt ausgegeben" value={`${formatNumber(totals.credits)} Credits`} />
        <KpiCard label="Impressions (alle)" value={formatNumber(totals.impressions)} />
        <KpiCard
          label="Klick-Rate"
          value={
            totals.impressions > 0
              ? `${((totals.clicks / totals.impressions) * 100).toFixed(2)} %`
              : "—"
          }
        />
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Rocket className="h-3.5 w-3.5" /> Aktive Boosts
        </h2>
        {active.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Du hast aktuell keine aktiven Boosts. Öffne in der App eine eigene Empfehlung
              und tippe auf „Empfehlung bewerben".
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {active.map((b) => (
              <BoostRow key={b.id} boost={b} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Verlauf
          </h2>
          <div className="grid gap-3">
            {past.map((b) => (
              <BoostRow key={b.id} boost={b} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

function BoostRow({ boost }: { boost: BoostSummary }) {
  const ctr =
    boost.impressions > 0
      ? `${((boost.clicks / boost.impressions) * 100).toFixed(2)} %`
      : "—";
  const ends = boost.ends_at ? new Date(boost.ends_at) : null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant(boost.status)}>{statusLabel(boost.status)}</Badge>
            <span className="text-sm font-medium">{tierLabel(boost.tier)}</span>
            <span className="text-xs text-muted-foreground">×{boost.multiplier}</span>
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {boost.post_preview?.link_title || boost.post_preview?.content || "(Inhalt entfernt)"}
          </p>
          {ends ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {boost.status === "active" ? "Endet" : "Beendet"}{" "}
              {ends.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
            </p>
          ) : null}
        </div>
        <div className="grid shrink-0 grid-cols-3 gap-4 sm:gap-6 text-right text-sm tabular-nums">
          <div>
            <div className="text-xs text-muted-foreground">Credits</div>
            <div className="font-semibold">{formatNumber(boost.credits_spent)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Impressions</div>
            <div className="font-semibold">{formatNumber(boost.impressions)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">CTR</div>
            <div className="font-semibold">{ctr}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function tierLabel(tier: BoostSummary["tier"]): string {
  switch (tier) {
    case "mini":
      return "Mini-Boost";
    case "standard":
      return "Standard";
    case "pro":
      return "Pro";
    case "brand_push":
      return "Brand-Push";
  }
}

function statusLabel(status: BoostStatus): string {
  return {
    active: "Aktiv",
    expired: "Abgelaufen",
    refunded: "Erstattet",
    cancelled: "Abgebrochen",
  }[status];
}

function statusVariant(status: BoostStatus): "default" | "secondary" | "outline" {
  return status === "active" ? "default" : "outline";
}
