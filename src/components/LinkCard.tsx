import { View, Text, Pressable, StyleSheet, Linking, Image } from "react-native";
import { ExternalLink } from "lucide-react-native";
import { colors } from "../constants/theme";
import { links as linksApi, type Post } from "../lib/api";

type Props = {
  post: Post;
};

export default function LinkCard({ post }: Props) {
  const openShop = async () => {
    const url = post.link_affiliate_url ?? post.link_url;
    if (!url) return;
    linksApi.trackClick({
      post_id: post.id,
      community_id: post.community_id,
      original_url: post.link_url ?? url,
      affiliate_url: url,
    }).catch(() => {});
    try { await Linking.openURL(url); } catch {}
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
              <ExternalLink color={colors.accent} size={11} strokeWidth={1.8} />
              {post.link_domain && <Text style={s.domain}>{post.link_domain}</Text>}
            </View>
          </View>
          {post.link_price != null && (
            <Text style={s.price}>{post.link_price.toFixed(2)} €</Text>
          )}
        </Pressable>
      )}

      {(post.link_affiliate_url || post.link_url) && (
        <Pressable style={s.shopBtn} onPress={openShop}>
          <Text style={s.shopBtnText}>Zum Produkt</Text>
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
  shopBtnText: { color: colors.bg, fontSize: 14, fontWeight: "700" },
});
