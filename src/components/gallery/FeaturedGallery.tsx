import { useCallback, useMemo } from "react";
import { View, Text, Image, Pressable, StyleSheet, Dimensions, FlatList, RefreshControl } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { colors } from "../../constants/theme";
import { useScrollStore } from "../../lib/scroll-store";
import type { Post } from "../../lib/api";

const { width: SCREEN_W } = Dimensions.get("window");
const GRID_GAP = 8;
const GRID_TILE = (SCREEN_W - GRID_GAP * 3) / 2;

type Props = {
  posts: Post[];
  refreshing?: boolean;
  onRefresh?: () => void;
};

export default function FeaturedGallery({ posts, refreshing, onRefresh }: Props) {
  const postsWithImages = useMemo(() => posts.filter((p) => p.link_image), [posts]);
  const hero = postsWithImages[0];
  const gridPosts = useMemo(() => postsWithImages.slice(1, 9), [postsWithImages]);
  const hasMore = postsWithImages.length > 9;

  const onTap = useCallback((postId: string) => {
    useScrollStore.getState().setScrollToPostId(postId);
    router.push("/reco");
  }, []);

  if (postsWithImages.length === 0) {
    return (
      <View style={s.emptyContainer}>
        <Text style={s.emptyTitle}>Noch keine Empfehlungen</Text>
        <Text style={s.emptyText}>Teile deine erste Empfehlung in einer Community!</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={gridPosts}
      keyExtractor={(p) => p.id}
      numColumns={2}
      columnWrapperStyle={gridPosts.length > 1 ? { gap: GRID_GAP } : undefined}
      contentContainerStyle={s.container}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} tintColor={colors.accent} /> : undefined}
      ListHeaderComponent={
        hero ? (
          <Pressable style={s.heroContainer} onPress={() => onTap(hero.id)}>
            <Image source={{ uri: hero.link_image! }} style={s.heroImage} />
            <LinearGradient colors={["transparent", "rgba(0,0,0,0.7)"]} style={s.heroGradient}>
              {hero.link_title && (
                <Text style={s.heroTitle} numberOfLines={2}>{hero.link_title}</Text>
              )}
              {hero.link_price != null && (
                <Text style={s.heroPrice}>{hero.link_price.toFixed(2)} €</Text>
              )}
            </LinearGradient>
          </Pressable>
        ) : null
      }
      ListFooterComponent={
        hasMore ? (
          <Pressable style={s.showAllBtn} onPress={() => router.push("/reco")}>
            <Text style={s.showAllText}>Alle anzeigen</Text>
          </Pressable>
        ) : null
      }
      ListEmptyComponent={null}
      ItemSeparatorComponent={() => <View style={{ height: GRID_GAP }} />}
      renderItem={({ item }) => (
        <Pressable style={s.gridTile} onPress={() => onTap(item.id)}>
          <Image source={{ uri: item.link_image! }} style={s.gridImage} />
          {item.link_price != null && (
            <View style={s.gridPriceBadge}>
              <Text style={s.gridPrice}>{item.link_price.toFixed(2)} €</Text>
            </View>
          )}
        </Pressable>
      )}
    />
  );
}

const s = StyleSheet.create({
  container: { paddingHorizontal: GRID_GAP, paddingBottom: 120 },

  heroContainer: { borderRadius: 16, overflow: "hidden", marginBottom: GRID_GAP, backgroundColor: colors.bgCard },
  heroImage: { width: "100%", height: 280, resizeMode: "cover" },
  heroGradient: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, paddingTop: 60 },
  heroTitle: { color: "#fff", fontSize: 20, fontWeight: "800", lineHeight: 26 },
  heroPrice: { color: colors.accent, fontSize: 16, fontWeight: "700", marginTop: 4 },

  gridTile: { width: GRID_TILE, aspectRatio: 1, borderRadius: 12, overflow: "hidden", backgroundColor: colors.bgCard },
  gridImage: { width: "100%", height: "100%", resizeMode: "cover" },
  gridPriceBadge: { position: "absolute", bottom: 8, left: 8, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  gridPrice: { color: colors.accent, fontSize: 12, fontWeight: "700" },

  showAllBtn: { alignItems: "center", paddingVertical: 16, marginTop: 8 },
  showAllText: { color: colors.accent, fontSize: 15, fontWeight: "700" },

  emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { color: colors.white, fontSize: 16, fontWeight: "700", marginBottom: 8 },
  emptyText: { color: colors.gray, fontSize: 14, textAlign: "center", lineHeight: 20 },
});
