import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { getPublicProfile } from "@/lib/queries/public";
import { formatNumber, initials } from "@/lib/utils";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  const name = profile?.display_name || profile?.username || username;
  return {
    title: `${name} (@${username})`,
    description: profile?.bio ?? `Profil von ${name} auf Vouchmi.`,
    openGraph: {
      title: `${name} · Vouchmi`,
      description: profile?.bio ?? undefined,
      images: profile?.avatar_url ? [profile.avatar_url] : undefined,
    },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) notFound();

  const displayName = profile.display_name || profile.username;
  const accentClass =
    profile.role === "brand"
      ? "from-primary/20 to-background"
      : profile.role === "influencer"
        ? "from-social/20 to-background"
        : "from-accent/20 to-background";

  return (
    <article className="space-y-6">
      <div className={`rounded-2xl bg-gradient-to-b ${accentClass} p-8`}>
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <Avatar className="h-24 w-24">
            {profile.avatar_url && (
              <AvatarImage src={profile.avatar_url} alt={displayName} />
            )}
            <AvatarFallback>{initials(displayName)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-display text-3xl">{displayName}</h1>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            {profile.bio && <p className="mt-3 max-w-prose text-sm">{profile.bio}</p>}
          </div>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Follower</p>
            <p className="mt-1 font-display text-2xl">{formatNumber(profile.followers_count)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Folgt</p>
            <p className="mt-1 font-display text-2xl">{formatNumber(profile.following_count)}</p>
          </CardContent>
        </Card>
      </section>
    </article>
  );
}
