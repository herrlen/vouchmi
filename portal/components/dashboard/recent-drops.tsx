import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { SponsoredDrop } from "@/lib/types";

const statusLabel: Record<SponsoredDrop["status"], string> = {
  draft: "Entwurf",
  scheduled: "Geplant",
  live: "Live",
  ended: "Beendet",
};

const statusTone: Record<SponsoredDrop["status"], "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  scheduled: "outline",
  live: "default",
  ended: "outline",
};

export function RecentDrops({ drops }: { drops: SponsoredDrop[] }) {
  if (drops.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">Noch keine Drops gestartet.</p>
        <Link
          href="/brand/campaigns"
          className="text-sm font-medium text-primary underline underline-offset-4"
        >
          Erstes Drop anlegen
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {drops.map((drop) => (
        <li
          key={drop.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{drop.title}</p>
            <p className="text-xs text-muted-foreground">
              {drop.starts_at ? formatDate(drop.starts_at) : "—"}
            </p>
          </div>
          <Badge variant={statusTone[drop.status]}>{statusLabel[drop.status]}</Badge>
        </li>
      ))}
    </ul>
  );
}
