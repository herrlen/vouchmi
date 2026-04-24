import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = { title: "Benachrichtigungen" };

export default function NotificationsSettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>E-Mail-Benachrichtigungen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="notify-brand">Neue Brand-Anfragen</Label>
            <p className="text-sm text-muted-foreground">
              Informiere mich, wenn eine Marke mich anfragt.
            </p>
          </div>
          <Switch id="notify-brand" disabled />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="notify-community">Community-Aktivität</Label>
            <p className="text-sm text-muted-foreground">
              Wöchentliche Zusammenfassung pro Community.
            </p>
          </div>
          <Switch id="notify-community" disabled />
        </div>
        <p className="text-xs text-muted-foreground">
          Backend-Endpoint für Benachrichtigungs-Präferenzen fehlt — siehe BACKEND-TODO.md.
        </p>
      </CardContent>
    </Card>
  );
}
