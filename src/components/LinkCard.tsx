import { View, Text, Pressable, StyleSheet, Linking, Image, Alert, ToastAndroid, Platform } from "react-native";
import { ExternalLink, Copy, Lock } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { colors } from "../constants/theme";
import { links as linksApi, type Post } from "../lib/api";

type Props = {
  post: Post;
};

export default function LinkCard({ post }: Props) {
  const shortUrl = post.link_affiliate_url ?? post.link_url;
  const shortLabel = shortUrl?.replace(/^https?:\/\//, "") ?? "";

  const openShop = async () => {
    if (!shortUrl) return;
    linksApi.trackClick({
      post_id: post.id,
      community_id: post.community_id,
      original_url: post.link_url ?? shortUrl,
      affiliate_url: shortUrl,
    }).catch(() => {});
    try { await Linking.openURL(shortUrl); } catch {}
  };

  const copyShort = async () => {
    if (!shortUrl) return;
    await Clipboard.setStringAsync(shortUrl);
    if (Platform.OS === "android") {
      ToastAndroid.show("Link kopiert", ToastAndroid.SHORT);
    } else {
      Alert.alert("Kopiert", "Kurzlink wurde in die Zwischenablage kopiert.");
    }
  };

  return (
    <View>
      {post.link_image && (
        <Pressable onPress={openShop}>
          <Image source={{ uri: post.link_image }} style={s.image} />
        </Pressable>
      )}

      {post.link_title && (
        <Pressable style={s.meta} onPress={openShop}>
          <View style={{ flex: 1 }}>
            <Text style={s.title} numberOfLines={2}>{post.link_title}</Text>
            <View style={s.domainRow}>
              <Lock color={colors.success} size={11} strokeWidth={2.2} />
              {post.link_domain && <Text style={s.domain}>{post.link_domain}</Text>}
            </View>
          </View>
          {post.link_price != null && (
            <Text style={s.price}>{post.link_price.toFixed(2)} €</Text>
          )}
        </Pressable>
      )}

      {shortUrl && (
        <View style={s.shortRow}>
          <Pressable style={s.shortLinkArea} onPress={openShop} accessibilityRole="link" accessibilityLabel={`Empfehlungs-Link ${shortLabel}`}>
            <ExternalLink color={colors.accent} size={13} strokeWidth={2} />
            <Text style={s.shortLink} numberOfLines={1}>{shortLabel}</Text>
          </Pressable>
          <Pressable style={s.copyBtn} onPress={copyShort} hitSlop={10} accessibilityRole="button" accessibilityLabel="Kurzlink kopieren">
            <Copy color={colors.indigo} size={14} strokeWidth={2.2} />
            <Text style={s.copyBtnText}>Kopieren</Text>
          </Pressable>
        </View>
      )}

      {shortUrl && (
        <Pressable style={s.shopBtn} onPress={openShop} accessibilityRole="button" accessibilityLabel="Empfehlung öffnen">
          <Text style={s.shopBtnText}>Empfehlung</Text>
          <ExternalLink color={colors.bg} size={13} strokeWidth={2} />
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  image: { width: "100%", aspectRatio: 1, backgroundColor: colors.bgCard },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgCard,
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 12,
    marginTop: 8,
    gap: 10,
  },
  title: { color: colors.white, fontSize: 13, fontWeight: "600", lineHeight: 17 },
  domainRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  domain: { color: colors.gray, fontSize: 11 },
  price: { color: colors.accent, fontSize: 16, fontWeight: "700" },
  shopBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 12,
    marginTop: 8,
    backgroundColor: colors.accent,
    paddingVertical: 10,
    borderRadius: 10,
    minHeight: 44,
  },
  shopBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  shortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    marginTop: 8,
  },
  shortLinkArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.bgCard,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  shortLink: { color: colors.accent, fontSize: 13, fontWeight: "700", flexShrink: 1 },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "rgba(79,70,229,0.18)",
  },
  copyBtnText: { color: colors.indigo, fontSize: 13, fontWeight: "700" },
});
