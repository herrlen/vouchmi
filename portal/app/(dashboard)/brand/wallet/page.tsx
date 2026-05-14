import type { Metadata } from "next";
import { Coins, Rocket, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiMaybe } from "@/lib/api";
import type { WalletPackagesResponse, WalletState, WalletTransaction } from "@/lib/types";
import { formatDate, formatNumber } from "@/lib/utils";
import { requireRole } from "../../role-guard";
import { startTopupAction } from "./actions";

export const metadata: Metadata = { title: "Wallet" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ ok?: string; error?: string; balance?: string }>;

export default async function BrandWalletPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole("brand");
  const sp = await searchParams;

  const [walletState, packagesResp] = await Promise.all([
    apiMaybe<WalletState>("/api/v1/wallet", { cache: "no-store" }),
    apiMaybe<WalletPackagesResponse>("/api/v1/wallet/packages", { cache: "no-store" }),
  ]);

  const balance = walletState?.wallet.balance_credits ?? 0;
  const transactions = walletState?.transactions ?? [];
  const packages = packagesResp?.packages ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wallet"
        description="Lade Credits auf, um deine Empfehlungen zu bewerben und mehr Reichweite zu erzeugen."
      />

      {sp.ok === "1" ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
        >
          Aufladung erfolgreich
          {sp.balance ? `. Neues Guthaben: ${formatNumber(Number(sp.balance))} Credits.` : "."}
        </div>
      ) : null}
      {sp.error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {errorMessage(sp.error)}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Coins className="h-4 w-4 text-amber-500" />
              Aktuelles Guthaben
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-semibold tabular-nums text-foreground">
                {formatNumber(balance)}
              </span>
              <span className="text-sm text-muted-foreground">Credits</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Credits verfallen gesetzlich erst nach 3 Jahren.
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Rocket className="h-4 w-4 text-amber-500" />
              So funktioniert&apos;s
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              1. Credits aufladen — Zahlung erfolgt sicher über PayPal.
            </p>
            <p>
              2. Auf jeder deiner Empfehlungen den „Bewerben"-Button öffnen und einen
              Tarif wählen.
            </p>
            <p>
              3. Reichweite × 2 bis × 8 für die gewählte Laufzeit. Geboostete Beiträge
              werden gemäß DSA mit „Beworben" gekennzeichnet.
            </p>
          </CardContent>
        </Card>
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" /> Aufladen
        </h2>

        {packages.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Derzeit sind keine Topup-Pakete verfügbar. Bitte versuche es später erneut.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {packages.map((pkg) => (
              <Card key={pkg.id} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col gap-3 pt-6">
                  <div>
                    <div className="text-2xl font-semibold tabular-nums">
                      {formatNumber(pkg.credits)}
                    </div>
                    <div className="text-xs text-muted-foreground">Credits</div>
                  </div>
                  <div className="text-sm font-medium text-foreground">
                    {(pkg.price_cents / 100).toLocaleString("de-DE", {
                      style: "currency",
                      currency: pkg.currency,
                    })}
                  </div>
                  <form action={startTopupAction} className="mt-auto space-y-2">
                    <input type="hidden" name="package_id" value={pkg.id} />
                    <label className="flex items-start gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        name="waiver_accepted"
                        required
                        className="mt-0.5 h-3.5 w-3.5"
                      />
                      <span>
                        Sofortige Bereitstellung. Mit dem Kauf verzichte ich auf mein
                        14-tägiges Widerrufsrecht (§ 356 Abs. 5 BGB).
                      </span>
                    </label>
                    <Button type="submit" size="sm" className="w-full">
                      Mit PayPal kaufen
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Verlauf
        </h2>
        <Card>
          <CardContent className="p-0">
            {transactions.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Noch keine Transaktionen.
              </p>
            ) : (
              <ul role="list" className="divide-y divide-border">
                {transactions.map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function TransactionRow({ tx }: { tx: WalletTransaction }) {
  const label = LABELS[tx.type] ?? tx.type;
  const positive = tx.credits_delta > 0;
  const sign = positive ? "+" : "";
  const reversed = tx.status === "reversed";

  return (
    <li className="flex items-center gap-4 px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className={reversed ? "text-sm font-medium line-through text-muted-foreground" : "text-sm font-medium"}>
          {label}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {formatDate(tx.created_at)}
          {tx.provider ? ` · ${providerLabel(tx.provider)}` : ""}
        </div>
      </div>
      {reversed ? (
        <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400">
          storniert
        </Badge>
      ) : null}
      <div
        className={
          reversed
            ? "tabular-nums text-sm font-semibold text-muted-foreground line-through"
            : positive
              ? "tabular-nums text-sm font-semibold text-emerald-600 dark:text-emerald-400"
              : "tabular-nums text-sm font-semibold text-foreground"
        }
      >
        {sign}
        {formatNumber(tx.credits_delta)}
      </div>
    </li>
  );
}

const LABELS: Record<WalletTransaction["type"], string> = {
  topup: "Aufladung",
  boost_spend: "Boost",
  refund: "Erstattung",
  admin_adjust: "Manuelle Anpassung",
  migration_bonus: "Migration-Bonus",
  reversal: "Stornierung",
};

function providerLabel(p: string): string {
  switch (p) {
    case "paypal":
      return "PayPal";
    case "apple_iap":
      return "Apple";
    case "admin":
      return "Admin";
    case "system":
      return "System";
    default:
      return p;
  }
}

function errorMessage(code: string): string {
  switch (code) {
    case "missing_package":
      return "Bitte wähle ein Paket aus.";
    case "waiver_required":
      return "Bitte bestätige die Sofort-Bereitstellung (Verzicht auf Widerrufsrecht), bevor du fortfährst.";
    case "new_user_cap":
      return "Aufladegrenze für neue Konten erreicht. Bitte versuche es in den kommenden Tagen erneut oder kontaktiere den Support.";
    case "unknown_package":
      return "Dieses Paket existiert nicht mehr.";
    case "paypal_unavailable":
      return "PayPal ist gerade nicht erreichbar. Bitte versuche es später erneut.";
    case "paypal_create_failed":
      return "Die PayPal-Zahlung konnte nicht gestartet werden.";
    case "capture_failed":
      return "Die Zahlung konnte nicht abgeschlossen werden. Wenn dein Konto belastet wurde, kontaktiere bitte den Support.";
    case "ownership_mismatch":
      return "Diese Transaktion gehört zu einem anderen Konto.";
    case "amount_mismatch":
      return "Der bezahlte Betrag stimmt nicht überein. Es wurde nichts gebucht.";
    default:
      return "Etwas ist schiefgelaufen. Bitte versuche es erneut.";
  }
}
