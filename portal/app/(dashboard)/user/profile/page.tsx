import type { Metadata } from "next";
import Link from "next/link";
import { User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { requireRole } from "../../role-guard";
import { initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Profil" };

export default async function UserProfilePage() {
  const user = await requireRole("user");
  const displayName = user.display_name || user.username;

  return (
    <div className="space-y-6">
      <PageHeader title="Dein Profil" description="Wie andere dich auf Vouchmi sehen." />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4" /> {displayName}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar className="h-20 w-20">
            {user.avatar_url && <AvatarImage src={user.avatar_url} alt={displayName} />}
            <AvatarFallback>{initials(displayName)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <div className="text-sm text-muted-foreground">@{user.username}</div>
            <div className="text-sm">{user.email}</div>
            <Link
              href={`/@${user.username}`}
              className="inline-block text-sm text-primary underline underline-offset-4"
            >
              Öffentliches Profil ansehen
            </Link>
          </div>
          <Button asChild variant="outline">
            <Link href="/settings">Bearbeiten</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
