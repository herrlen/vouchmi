import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { initials } from "@/lib/utils";
import { requireRole } from "../../role-guard";

export const metadata: Metadata = { title: "Creator-Profil" };

export default async function InfluencerProfilePage() {
  const user = await requireRole("influencer");
  const displayName = user.display_name || user.username;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Creator-Profil"
        description="Wie Brands und Communities dich sehen."
      />
      <Card>
        <CardHeader>
          <CardTitle>{displayName}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            {user.avatar_url && <AvatarImage src={user.avatar_url} alt={displayName} />}
            <AvatarFallback>{initials(displayName)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1 text-sm">
            <div className="text-muted-foreground">@{user.username}</div>
            <div>{user.email}</div>
            <Link
              href={`/@${user.username}`}
              className="inline-block text-primary underline underline-offset-4"
            >
              Öffentliche Creator-Seite
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
