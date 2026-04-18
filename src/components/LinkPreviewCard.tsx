import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { Lock } from "lucide-react-native";
import type { LinkPreview } from "../lib/api";

type Props = {
  isLoading: boolean;
  preview: LinkPreview | null;
  url: string;
};

export default function LinkPreviewCard({ isLoading, preview, url }: Props) {
  const domain = extractDomain(url);

  if (isLoading) {
    return (
      <View style={[s.card, { minHeight: 240 }]}>
        <View style={[s.image, s.skeleton]} />
        <View style={s.content}>
          <View style={[s.skeletonLine, s.skeleton, { width: "85%" }]} />
          <View style={[s.skeletonLine, s.skeleton, { width: "55%", marginTop: 8, height: 10 }]} />
          <ActivityIndicator color="#F59E0B" style={{ alignSelf: "flex-start", marginTop: 12 }} size="small" />
        </View>
      </View>
    );
  }

  return (
    <View style={s.card}>
      {preview?.image ? (
        <Image source={{ uri: preview.image }} style={s.image} resizeMode="cover" />
      ) : (
        <View style={s.imageFallback}>
          <Text style={s.imageFallbackLetter}>{domain.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={s.content}>
        <Text style={s.title} numberOfLines={2}>{preview?.title ?? domain}</Text>
        {preview?.description && <Text style={s.description} numberOfLines={2}>{preview.description}</Text>}
        <View style={s.domainRow}>
          <Lock color="#10B981" size={10} strokeWidth={2.5} />
          <Text style={s.domain} numberOfLines={1}>{domain}</Text>
        </View>
        {preview?.price != null && (
          <Text style={s.price}>{preview.price.toFixed(2)} €</Text>
        )}
      </View>
    </View>
  );
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

const s = StyleSheet.create({
  card: { backgroundColor: "#141926", borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: "#1E2235" },
  image: { width: "100%", height: 180, backgroundColor: "#0A0E1A" },
  imageFallback: { width: "100%", height: 120, backgroundColor: "#0A0E1A", alignItems: "center", justifyContent: "center" },
  imageFallbackLetter: { fontSize: 48, fontWeight: "800", color: "#F59E0B" },
  content: { padding: 16, gap: 4 },
  title: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", lineHeight: 22 },
  description: { color: "#94A3B8", fontSize: 13, lineHeight: 18 },
  domainRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  domain: { color: "#94A3B8", fontSize: 12, flex: 1 },
  price: { color: "#F59E0B", fontSize: 18, fontWeight: "800", marginTop: 6 },
  skeleton: { backgroundColor: "#1E2235" },
  skeletonLine: { height: 14, borderRadius: 4 },
});
