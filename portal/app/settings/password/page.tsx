import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Passwort ändern" };

export default function PasswordSettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Passwort ändern</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="max-w-sm space-y-4">
          <div>
            <Label htmlFor="current_password">Aktuelles Passwort</Label>
            <Input id="current_password" name="current_password" type="password" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="new_password">Neues Passwort</Label>
            <Input id="new_password" name="new_password" type="password" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="new_password_confirmation">Passwort bestätigen</Label>
            <Input
              id="new_password_confirmation"
              name="new_password_confirmation"
              type="password"
              className="mt-1.5"
            />
          </div>
          <Button type="submit" disabled>
            Speichern
          </Button>
          <p className="text-xs text-muted-foreground">
            Passwort-Änderung über das Portal folgt. Nutze bis dahin „Passwort vergessen" auf der
            Login-Seite, um ein neues zu setzen.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
