import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Image, Pressable, RefreshControl, ActivityIndicator, Alert, Linking, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Heart, MessageCircle, Share2, MoreHorizontal, ExternalLink, Plus } from "lucide-react-native";
import { router } from "expo-router";
import { colors } from "../../src/constants/theme";
import { feed as feedApi, links as linksApi, type Post } from "../../src/lib/api";

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "gerade eben";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function FeedTab() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const toggleLike = async (pid: string) => {
    try {
      const { like_count } = await feedApi.like(pid);
      setPosts((ps) => ps.map((p) => (p.id === pid ? { ...p, like_count } : p)));
    } catch {}
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.title}>TrusCart</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          ListHeaderComponent={<StoryBar posts={posts} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyTitle}>Noch keine Posts</Text>
              <Text style={s.emptyText}>Teile ein Produkt oder tritt einer Community bei.</Text>
              <Pressable style={s.emptyBtn} onPress={() => router.push("/create-post")}>
                <Text style={s.emptyBtnText}>Produkt teilen</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => <PostItem post={item} onLike={toggleLike} />}
        />
      )}
    </SafeAreaView>
  );
}

const SB = 62;
function StoryBar({ posts }: { posts: Post[] }) {
  const authors = posts.map((p) => p.author).filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i).slice(0, 10);
  return (
    <View style={{ borderBottomWidth: 0.5, borderBottomColor: colors.border, paddingVertical: 10 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 14 }}>
        <Pressable style={{ alignItems: "center", width: SB + 8 }} onPress={() => router.push("/create-story")}>
          <View style={{ width: SB + 6, height: SB + 6, borderRadius: (SB + 6) / 2, backgroundColor: colors.bgCard, justifyContent: "center", alignItems: "center" }}>
            <View style={{ width: SB, height: SB, borderRadius: SB / 2, backgroundColor: colors.bgInput, justifyContent: "center", alignItems: "center" }}>
              <Plus color={colors.accent} size={26} />
            </View>
          </View>
          <Text style={{ color: colors.gray, fontSize: 11, marginTop: 5 }}>Du</Text>
        </Pressable>
        {authors.map((a) => (
          <View key={a.id} style={{ alignItems: "center", width: SB + 8 }}>
            <View style={{ width: SB + 6, height: SB + 6, borderRadius: (SB + 6) / 2, borderWidth: 2, borderColor: colors.accent, justifyContent: "center", alignItems: "center" }}>
              {a.avatar_url ? (
                <Image source={{ uri: a.avatar_url }} style={{ width: SB, height: SB, borderRadius: SB / 2 }} />
              ) : (
                <View style={{ width: SB, height: SB, borderRadius: SB / 2, backgroundColor: colors.bgInput, justifyContent: "center", alignItems: "center" }}>
                  <Text style={{ color: colors.white, fontWeight: "700", fontSize: 22 }}>{(a.display_name ?? a.username)[0]?.toUpperCase()}</Text>
                </View>
              )}
            </View>
            <Text style={{ color: colors.gray, fontSize: 11, marginTop: 5, maxWidth: SB + 8, textAlign: "center" }} numberOfLines={1}>{a.username}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function PostItem({ post, onLike }: { post: Post; onLike: (id: string) => void }) {
  const initial = (post.author.display_name ?? post.author.username)[0]?.toUpperCase() ?? "?";

  const openShop = async () => {
    const url = post.link_affiliate_url ?? post.link_url;
    if (!url) return;
    try {
      linksApi.trackClick({
        post_id: post.id,
        community_id: post.community_id,
        original_url: post.link_url ?? url,
        affiliate_url: url,
      }).catch(() => {});
      const ok = await Linking.canOpenURL(url);
      if (ok) await Linking.openURL(url);
      else Alert.alert("Fehler", "Link konnte nicht geöffnet werden.");
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    }
  };

  return (
    <View style={s.post}>
      <View style={s.postHeader}>
        <Pressable onPress={() => router.push(`/user/${post.author.id}`)}>
          {post.author.avatar_url ? (
            <Image source={{ uri: post.author.avatar_url }} style={s.postAvatar} />
          ) : (
            <View style={[s.postAvatar, s.avatarPlaceholder]}>
              <Text style={s.avatarInitial}>{initial}</Text>
            </View>
          )}
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={() => router.push(`/user/${post.author.id}`)}>
          <Text style={s.authorName}>{post.author.display_name ?? post.author.username}</Text>
          <Text style={s.username}>@{post.author.username} · {timeAgo(post.created_at)}</Text>
        </Pressable>
        <Pressable hitSlop={10} style={s.menuBtn}>
          <MoreHorizontal color={colors.gray} size={20} />
        </Pressable>
      </View>

      <Pressable onPress={openShop}>
        {post.link_image ? (
          <Image source={{ uri: post.link_image }} style={s.postImage} />
        ) : (
          <View style={[s.postImage, s.noImage]}>
            <Text style={s.noImageText}>🛒</Text>
          </View>
        )}
      </Pressable>

      {post.link_title && (
        <Pressable onPress={openShop} style={s.linkInfo}>
          <Text style={s.linkTitle} numberOfLines={2}>{post.link_title}</Text>
          <View style={s.linkMetaRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <ExternalLink color={colors.accent} size={12} />
              {post.link_domain && <Text style={s.linkDomain}>{post.link_domain}</Text>}
            </View>
            {post.link_price != null && <Text style={s.linkPrice}>{post.link_price.toFixed(2)} €</Text>}
          </View>
        </Pressable>
      )}

      <Pressable style={s.openBtn} onPress={openShop}>
        <Text style={s.openBtnText}>Zum Produkt</Text>
        <ExternalLink color={colors.bg} size={15} />
      </Pressable>

      <View style={s.actions}>
        <Pressable style={s.actionBtn} hitSlop={6} onPress={() => onLike(post.id)}>
          <Heart color={colors.white} size={22} />
          {post.like_count > 0 && <Text style={s.count}>{post.like_count}</Text>}
        </Pressable>
        <Pressable style={s.actionBtn} hitSlop={6} onPress={() => router.push(`/post/${post.id}`)}>
          <MessageCircle color={colors.white} size={22} />
          {post.comment_count > 0 && <Text style={s.count}>{post.comment_count}</Text>}
        </Pressable>
        <Pressable style={s.actionBtn} hitSlop={6}>
          <Share2 color={colors.white} size={22} />
        </Pressable>
      </View>

      {!!post.content && <Text style={s.postText}>{post.content}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  title: { color: colors.accent, fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  empty: { padding: 40, alignItems: "center", marginTop: 40 },
  emptyTitle: { color: colors.white, fontSize: 18, fontWeight: "700", marginBottom: 6 },
  emptyText: { color: colors.gray, fontSize: 14, textAlign: "center", marginBottom: 18 },
  emptyBtn: { backgroundColor: colors.accent, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 10 },
  emptyBtnText: { color: colors.bg, fontWeight: "700" },
  post: { marginBottom: 14 },
  postHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  postAvatar: { width: 38, height: 38, borderRadius: 19 },
  avatarPlaceholder: { backgroundColor: colors.accent, justifyContent: "center", alignItems: "center" },
  avatarInitial: { color: colors.bg, fontWeight: "800", fontSize: 16 },
  authorName: { color: colors.white, fontSize: 14, fontWeight: "600" },
  username: { color: colors.gray, fontSize: 12, marginTop: 1 },
  menuBtn: { minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "flex-end" },
  postImage: { width: "100%", aspectRatio: 1, backgroundColor: colors.bgCard },
  noImage: { justifyContent: "center", alignItems: "center" },
  noImageText: { fontSize: 48 },
  linkInfo: { paddingHorizontal: 12, paddingTop: 10 },
  linkTitle: { color: colors.white, fontSize: 14, fontWeight: "600", lineHeight: 19 },
  linkMetaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  linkDomain: { color: colors.gray, fontSize: 12 },
  linkPrice: { color: colors.accent, fontSize: 14, fontWeight: "700" },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 12,
    marginTop: 10,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 10,
    minHeight: 44,
  },
  openBtnText: { color: colors.bg, fontSize: 15, fontWeight: "700" },
  actions: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 8, gap: 18 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, paddingVertical: 6 },
  count: { color: colors.white, fontSize: 13, fontWeight: "500" },
  postText: { color: colors.white, fontSize: 14, lineHeight: 20, paddingHorizontal: 12, paddingTop: 4 },
});
