import { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, FlatList, Image, Pressable, RefreshControl, ActivityIndicator, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MoreHorizontal, Plus } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { colors } from "../../src/constants/theme";
import { feed as feedApi, type Post } from "../../src/lib/api";
import { useScrollStore } from "../../src/lib/scroll-store";
import PostActions from "../../src/components/PostActions";
import LinkCard from "../../src/components/LinkCard";

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
          contentContainerStyle={{ paddingBottom: 120 }}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: true }), 500);
          }}
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
          renderItem={({ item }) => <PostItem post={item} onLikeChange={handleLikeChange} />}
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
          <Pressable key={a.id} style={{ alignItems: "center", width: SB + 8 }} onPress={() => router.push(`/user/${a.id}`)}>
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
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const COLLAPSED_LENGTH = 140;

function PostItem({ post, onLikeChange }: { post: Post; onLikeChange: (id: string, count: number) => void }) {
  const initial = (post.author.display_name ?? post.author.username)[0]?.toUpperCase() ?? "?";
  const [expanded, setExpanded] = useState(false);

  const content = post.content ?? "";
  const isLong = content.length > COLLAPSED_LENGTH;
  const displayContent = !isLong || expanded ? content : content.slice(0, COLLAPSED_LENGTH).trimEnd() + "…";

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
      </View>

      <LinkCard post={post} />
      <PostActions post={post} onLikeChange={onLikeChange} />

      {!!content && (
        <View style={s.descBlock}>
          <Text style={s.postText}>{displayContent}</Text>
          {isLong && (
            <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={6}>
              <Text style={s.moreText}>{expanded ? "weniger" : "mehr"}</Text>
            </Pressable>
          )}
        </View>
      )}
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
  emptyBtnText: { color: "#fff", fontWeight: "700" },
  post: { marginBottom: 6, borderBottomWidth: 0.5, borderBottomColor: colors.border, paddingBottom: 6 },
  postHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  postAvatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: { backgroundColor: colors.accent, justifyContent: "center", alignItems: "center" },
  avatarInitial: { color: "#fff", fontWeight: "800", fontSize: 15 },
  authorName: { color: colors.white, fontSize: 14, fontWeight: "600" },
  username: { color: colors.gray, fontSize: 12, marginTop: 1 },
  postText: { color: colors.white, fontSize: 14, lineHeight: 19 },
  descBlock: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 6 },
  moreText: { color: colors.gray, fontSize: 13, marginTop: 2, fontWeight: "500" },
  commentsToggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
  commentsToggleText: { color: colors.gray, fontSize: 13, fontWeight: "500" },
  commentsList: { paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  loadingText: { color: colors.gray, fontSize: 12, paddingVertical: 6 },
  commentRow: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  cAvatar: { width: 28, height: 28, borderRadius: 14 },
  cAvatarFallback: { backgroundColor: colors.accent, justifyContent: "center", alignItems: "center" },
  cInitial: { color: "#fff", fontWeight: "700", fontSize: 11 },
  cHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 1 },
  cName: { color: colors.white, fontSize: 12, fontWeight: "600" },
  cTime: { color: colors.grayDark, fontSize: 10 },
  cText: { color: colors.white, fontSize: 13, lineHeight: 17 },
});
