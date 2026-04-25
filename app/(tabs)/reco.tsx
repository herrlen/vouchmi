import { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, FlatList, Image, Pressable, RefreshControl, ActivityIndicator, Alert, Linking, AppState } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { colors } from "../../src/constants/theme";
import { feed as feedApi, type Post } from "../../src/lib/api";
import VSeal from "../../src/components/VSeal";
import { useScrollStore } from "../../src/lib/scroll-store";
import PostActions from "../../src/components/PostActions";

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "gerade eben";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function RecoTab() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<FlatList>(null);
  const scrollToPostId = useScrollStore((s) => s.scrollToPostId);
  const clearScroll = useScrollStore((s) => s.setScrollToPostId);
  const scrollToTopCounter = useScrollStore((s) => s.scrollToTopReco);

  const load = useCallback(async () => {
    try {
      const { data } = await feedApi.all();
      setPosts(data);
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (scrollToPostId && posts.length > 0) {
      const idx = posts.findIndex((p) => p.id === scrollToPostId);
      if (idx >= 0) {
        setTimeout(() => {
          listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0 });
        }, 300);
      }
      clearScroll(null);
    }
  }, [scrollToPostId, posts]);

  useEffect(() => {
    if (scrollToTopCounter === 0) return;
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [scrollToTopCounter]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") load();
    });
    return () => sub.remove();
  }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleLikeChange = (pid: string, count: number) => {
    setPosts((ps) => ps.map((p) => (p.id === pid ? { ...p, like_count: count } : p)));
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          ref={listRef}
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: true }), 500);
          }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          ListHeaderComponent={null}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyTitle}>Noch keine Posts</Text>
              <Text style={s.emptyText}>Teile ein Produkt oder tritt einer Community bei.</Text>
              <Pressable style={s.emptyBtn} onPress={() => router.push("/create-post")}>
                <Text style={s.emptyBtnText}>Produkt teilen</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => <PostCard post={item} onLikeChange={handleLikeChange} />}
        />
      )}
    </SafeAreaView>
  );
}

function PostCard({ post, onLikeChange }: { post: Post; onLikeChange: (id: string, count: number) => void }) {
  const initial = (post.author.display_name ?? post.author.username)[0]?.toUpperCase() ?? "?";

  const role = (post.author as any).role ?? "user";
  const badgeColor = role === "influencer" ? "#F59E0B" : role === "brand" ? "#6366F1" : "#10B981";
  const badgeLabel = role === "influencer" ? "Influencer" : role === "brand" ? "Brand" : "Nutzer";

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.cardHeader}>
        <Pressable onPress={() => router.push(`/user/${post.author.id}`)}>
          {post.author.avatar_url ? (
            <Image source={{ uri: post.author.avatar_url }} style={s.cardAvatar} />
          ) : (
            <View style={[s.cardAvatar, { backgroundColor: badgeColor }]}>
              <Text style={s.cardAvatarInitial}>{initial}</Text>
            </View>
          )}
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={() => router.push(`/user/${post.author.id}`)}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Text style={s.cardAuthor}>{post.author.display_name ?? post.author.username}</Text>
            {post.author.tier && post.author.tier !== "none" && (
              <VSeal tier={post.author.tier as any} opacity={post.author.tier_badge_opacity ?? 1} size="xs" />
            )}
          </View>
          <Text style={s.cardTime}>{post.community?.name ? `${post.community.name} · ` : ""}{timeAgo(post.created_at)}</Text>
        </Pressable>

        <View style={[s.roleBadge, { backgroundColor: badgeColor + "18" }]}>
          <View style={[s.roleDot, { backgroundColor: badgeColor }]} />
          <Text style={[s.roleBadgeText, { color: badgeColor }]}>{badgeLabel}</Text>
        </View>
      </View>

      {/* Product image */}
      {post.link_image && (
        <Pressable onPress={() => {
          const url = post.link_affiliate_url ?? post.link_url;
          if (url) Linking.openURL(url);
        }}>
          <Image source={{ uri: post.link_image }} style={s.cardImage} />
        </Pressable>
      )}

      {/* Title + Price */}
      {(post.link_title || post.link_price != null) && (
        <View style={s.cardTitleRow}>
          {post.link_title && <Text style={s.cardTitle} numberOfLines={2}>{post.link_title}</Text>}
          {post.link_price != null && <Text style={s.cardPrice}>{post.link_price.toFixed(2)} €</Text>}
        </View>
      )}

      {/* Description */}
      {!!post.content && <Text style={s.cardDesc}>{post.content}</Text>}

      {/* Actions */}
      <PostActions post={post} onLikeChange={onLikeChange} />

      {/* Empfehlung button */}
      {(post.link_affiliate_url || post.link_url) && (
        <Pressable
          style={s.recoBtn}
          onPress={() => {
            const url = post.link_affiliate_url ?? post.link_url;
            if (url) Linking.openURL(url);
          }}
        >
          <Text style={s.recoBtnText}>Empfehlung</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0E1A" },
  empty: { padding: 40, alignItems: "center", marginTop: 40 },
  emptyTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "700", marginBottom: 6 },
  emptyText: { color: "#64748B", fontSize: 14, textAlign: "center", marginBottom: 18 },
  emptyBtn: { backgroundColor: colors.accent, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14 },
  emptyBtnText: { color: "#1A1D2E", fontWeight: "700" },

  // Card
  card: { backgroundColor: "#141926", borderRadius: 24, marginHorizontal: 12, marginBottom: 12, overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 16, paddingBottom: 10 },
  cardAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  cardAvatarInitial: { color: "#fff", fontWeight: "800", fontSize: 16 },
  cardAuthor: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  cardTime: { color: "#64748B", fontSize: 12, marginTop: 1 },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  roleDot: { width: 8, height: 8, borderRadius: 4 },
  roleBadgeText: { fontSize: 11, fontWeight: "700" },
  cardImage: { width: "100%", aspectRatio: 4 / 5, backgroundColor: "#FFFFFF", resizeMode: "contain", overflow: "hidden" },
  cardTitleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  cardTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "800", flex: 1, lineHeight: 22 },
  cardPrice: { color: "#F59E0B", fontSize: 16, fontWeight: "800" },
  cardDesc: { color: "#CBD5E1", fontSize: 14, lineHeight: 20, paddingHorizontal: 16, paddingTop: 6, fontStyle: "italic" },
  recoBtn: { backgroundColor: "#F59E0B", marginHorizontal: 16, marginBottom: 16, marginTop: 4, paddingVertical: 12, borderRadius: 14, alignItems: "center", minHeight: 44, justifyContent: "center" },
  recoBtnText: { color: "#1A1D2E", fontSize: 14, fontWeight: "800" },
});
