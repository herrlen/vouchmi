import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getPublicCommunity } from "@/lib/queries/public";
import { formatNumber } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const community = await getPublicCommunity(slug);
  return {
    title: community ? community.name : "Community",
    description:
      community?.description ?? "Community auf Vouchmi — entdecke Empfehlungen und Drops.",
    openGraph: {
      title: community?.name ?? "Vouchmi Community",
      description: community?.description ?? undefined,
      images: community?.image_url ? [community.image_url] : undefined,
    },
  };
}

export default async function PublicCommunityPage({ params }: Props) {
  const { slug } = await params;
  const community = await getPublicCommunity(slug);
  if (!community) notFound();

  return (
    <article className="space-y-6">
      <header className="rounded-2xl bg-gradient-to-b from-accent/20 to-background p-8">
        <h1 className="font-display text-3xl">{community.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">/c/{community.slug}</p>
        {community.description && (
          <p className="mt-3 max-w-prose text-sm">{community.description}</p>
        )}
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Mitglieder</p>
            <p className="mt-1 font-display text-2xl">{formatNumber(community.member_count)}</p>
          </CardContent>
        </Card>
      </section>
    </article>
  );
}
