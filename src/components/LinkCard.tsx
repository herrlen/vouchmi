import { View, Text, Pressable, StyleSheet, Linking, Image } from "react-native";
import { ExternalLink, Lock } from "lucide-react-native";
import { colors } from "../constants/theme";
import { links as linksApi, type Post } from "../lib/api";

type Props = {
  post: Post;
};

export default function LinkCard({ post }: Props) {
  const shortUrl = post.link_affiliate_url ?? post.link_url;
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
        <Pressable style={s.shopBtn} onPress={openShop} accessibilityRole="button" accessibilityLabel="Empfehlung öffnen">
          <Text style={s.shopBtnText}>Empfehlung</Text>
          <ExternalLink color={colors.bg} size={13} strokeWidth={2} />
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  image: { width: "100%", aspectRatio: 4 / 5, backgroundColor: "#FFFFFF", resizeMode: "contain", overflow: "hidden" },
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

});
