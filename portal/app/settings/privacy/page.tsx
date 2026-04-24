import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Datenschutz" };

export default function PrivacySettingsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Datenexport</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Lade dir eine Kopie deiner Vouchmi-Daten herunter.
          </p>
          <Button className="mt-3" variant="outline" disabled>
            Export anfordern
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Konto löschen</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Unwiderrufliche Löschung inkl. aller Posts, Empfehlungen und Follower-Beziehungen.
            Nutzt /api/account (DELETE).
          </p>
          <Button className="mt-3" variant="destructive" disabled>
            Konto endgültig löschen
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
