import type { Metadata } from "next";
import { Megaphone, MousePointerClick, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { requireRole } from "../role-guard";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ReachChart } from "@/components/dashboard/reach-chart";
import { RecentDrops } from "@/components/dashboard/recent-drops";
import { getBrandOverview } from "@/lib/queries/brand";

export const metadata: Metadata = { title: "Brand Übersicht" };
export const dynamic = "force-dynamic";

export default async function BrandOverviewPage() {
  const user = await requireRole("brand");
  const data = await getBrandOverview();

  const displayName = user.display_name || user.username;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Hi {displayName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hier siehst du, was gerade rund um deine Marke passiert.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/brand/seeding">
              <Sparkles className="mr-2 h-4 w-4" /> Post seeden
            </Link>
          </Button>
          <Button asChild>
            <Link href="/brand/campaigns">
              <Megaphone className="mr-2 h-4 w-4" /> Neues Drop
            </Link>
          </Button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Aktive Drops"
          value={data.activeDrops}
          icon={Megaphone}
          tone="primary"
        />
        <KpiCard
          label="Community-Reach · 7T"
          value={data.reach7d}
          icon={Users}
          tone="accent"
        />
        <KpiCard
          label="Posts mit Brand-Tag"
          value={data.taggedPosts}
          icon={Sparkles}
          tone="social"
        />
        <KpiCard
          label="Affiliate-Klicks"
          value={data.affiliateClicks}
          icon={MousePointerClick}
          tone="success"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Reichweite · letzte 14 Tage</CardTitle>
          </CardHeader>
          <CardContent>
            <ReachChart data={data.reachSeries} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Letzte Drops</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentDrops drops={data.recentDrops} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
