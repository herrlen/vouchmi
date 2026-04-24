import type { Metadata } from "next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { fetchCurrentUser } from "@/lib/queries/auth";
import { redirect } from "next/navigation";
import { initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Profil-Einstellungen" };
export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const user = await fetchCurrentUser();
  if (!user) redirect("/login");

  const displayName = user.display_name || user.username;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {user.avatar_url && <AvatarImage src={user.avatar_url} alt={displayName} />}
            <AvatarFallback>{initials(displayName)}</AvatarFallback>
          </Avatar>
          <Button variant="outline" disabled>
            Avatar ändern
          </Button>
        </div>

        <form className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="display_name">Anzeigename</Label>
            <Input
              id="display_name"
              name="display_name"
              defaultValue={user.display_name ?? ""}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="username">Benutzername</Label>
            <Input
              id="username"
              name="username"
              defaultValue={user.username}
              className="mt-1.5"
              disabled
            />
          </div>
          <div>
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={user.email}
              className="mt-1.5"
              disabled
            />
          </div>

          <div className="sm:col-span-2">
            <Button type="submit" disabled>
              Speichern
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Bearbeitung über das Portal folgt in Kürze. Aktuell änderbar über die Mobile-App.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
