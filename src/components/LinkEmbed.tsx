// src/components/LinkEmbed.tsx
import { View, Text, Pressable, StyleSheet, Linking } from "react-native";
import { Image } from "expo-image";
import { colors } from "../constants/theme";
import * as api from "../lib/api";

type Props = {
  postId?: string;
  communityId?: string;
  url: string;
  affiliateUrl: string;
  title?: string | null;
  image?: string | null;
  price?: number | null;
  domain?: string | null;
  compact?: boolean;
};

export default function LinkEmbed({ postId, communityId, url, affiliateUrl, title, image, price, domain, compact }: Props) {
  const handlePress = async () => {
    try { await api.links.trackClick({ post_id: postId, community_id: communityId, original_url: url, affiliate_url: affiliateUrl }); } catch {}
    Linking.openURL(affiliateUrl);
  };

  return (
    <Pressable style={[s.card, compact && s.compact]} onPress={handlePress}>
      {image && <Image source={{ uri: image }} style={compact ? s.imgS : s.img} contentFit="cover" />}
      <View style={s.info}>
        {domain && <Text style={s.domain}>{domain.replace("www.", "")}</Text>}
        <Text style={s.title} numberOfLines={compact ? 1 : 2}>{title ?? "Link öffnen"}</Text>
        {price != null && <Text style={s.price}>€{price.toFixed(2)}</Text>}
      </View>
      <View style={s.arrow}><Text style={s.arrowText}>→</Text></View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: "row", backgroundColor: colors.bgInput, borderRadius: 12, overflow: "hidden", marginTop: 10, alignItems: "center" },
  compact: { marginTop: 6 },
  img: { width: 80, height: 80 },
  imgS: { width: 48, height: 48, borderRadius: 8, margin: 8 },
  info: { flex: 1, padding: 10 },
  domain: { color: colors.gray, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8 },
  title: { color: colors.white, fontSize: 14, fontWeight: "600", marginTop: 2 },
  price: { color: colors.accent, fontSize: 16, fontWeight: "bold", marginTop: 3 },
  arrow: { paddingRight: 14 },
  arrowText: { color: colors.accent, fontSize: 18 },
});
