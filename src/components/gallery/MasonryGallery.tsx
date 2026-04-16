import { useCallback, useMemo } from "react";
import { View, Text, Image, Pressable, StyleSheet, Dimensions, ScrollView, RefreshControl } from "react-native";
import { router } from "expo-router";
import { colors } from "../../constants/theme";
import { useScrollStore } from "../../lib/scroll-store";
import type { Post } from "../../lib/api";

const { width: SCREEN_W } = Dimensions.get("window");
const GAP = 8;
const COL_W = (SCREEN_W - GAP * 3) / 2; // 2 columns with gap on sides + middle

type Props = {
  posts: Post[];
  refreshing?: boolean;
  onRefresh?: () => void;
};

export default function MasonryGallery({ posts, refreshing, onRefresh }: Props) {
  const postsWithImages = useMemo(() => posts.filter((p) => p.link_image), [posts]);

  // Distribute posts into 2 columns with balanced heights
  const columns = useMemo(() => {
    const left: { post: Post; height: number }[] = [];
    const right: { post: Post; height: number }[] = [];
    let leftH = 0;
    let rightH = 0;

    for (const post of postsWithImages) {
      // Vary aspect ratio based on content to create visual interest
      const hash = post.id.charCodeAt(0) + post.id.charCodeAt(1);
      const ratio = [1.0, 1.3, 0.8, 1.1, 1.4, 0.9][hash % 6];
      const h = COL_W * ratio;

      if (leftH <= rightH) {
        left.push({ post, height: h });
        leftH += h + GAP;
      } else {
        right.push({ post, height: h });
        rightH += h + GAP;
      }
    }
    return [left, right];
  }, [postsWithImages]);

  const onTap = useCallback((postId: string) => {
    useScrollStore.getState().setScrollToPostId(postId);
    router.push("/reco");
  }, []);

  if (postsWithImages.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={s.emptyContainer}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} tintColor={colors.accent} /> : undefined}
      >
        <Text style={s.emptyTitle}>Noch keine Empfehlungen</Text>
        <Text style={s.emptyText}>Teile deine erste Empfehlung in einer Community!</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={s.container}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} tintColor={colors.accent} /> : undefined}
    >
      <View style={s.row}>
        {columns.map((col, ci) => (
          <View key={ci} style={s.column}>
            {col.map(({ post, height }) => (
              <Pressable key={post.id} style={[s.tile, { height }]} onPress={() => onTap(post.id)}>
                <Image source={{ uri: post.link_image! }} style={s.tileImg} />
                {post.link_price != null && (
                  <View style={s.priceBadge}>
                    <Text style={s.priceText}>{post.link_price.toFixed(2)} €</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { paddingHorizontal: GAP, paddingTop: GAP, paddingBottom: 120 },
  row: { flexDirection: "row", gap: GAP },
  column: { flex: 1, gap: GAP },
  tile: { borderRadius: 12, overflow: "hidden", backgroundColor: colors.bgCard },
  tileImg: { width: "100%", height: "100%", resizeMode: "cover" },
  priceBadge: { position: "absolute", bottom: 8, left: 8, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  priceText: { color: colors.accent, fontSize: 12, fontWeight: "700" },
  emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { color: colors.white, fontSize: 16, fontWeight: "700", marginBottom: 8 },
  emptyText: { color: colors.gray, fontSize: 14, textAlign: "center", lineHeight: 20 },
});
