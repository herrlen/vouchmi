import { useState } from "react";
import { View, Text, Image, Pressable, StyleSheet, RefreshControl, FlatList } from "react-native";
import { router } from "expo-router";
import { colors } from "../../constants/theme";
import { type Post } from "../../lib/api";
import PostActions from "../PostActions";
import LinkCard from "../LinkCard";

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "gerade eben";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

type Props = {
  posts: Post[];
  refreshing?: boolean;
  onRefresh?: () => void;
  header?: React.ReactElement | null;
};

export default function StoryGallery({ posts, refreshing, onRefresh, header }: Props) {
  return (
    <FlatList
      data={posts}
      keyExtractor={(p) => p.id}
      contentContainerStyle={{ paddingBottom: 120 }}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} tintColor={colors.accent} /> : undefined}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <View style={s.emptyContainer}>
          <Text style={s.emptyTitle}>Noch keine Empfehlungen</Text>
          <Text style={s.emptyText}>Teile deine erste Empfehlung in einer Community!</Text>
        </View>
      }
      renderItem={({ item }) => <FeedItem post={item} />}
    />
  );
}

const COLLAPSED_LENGTH = 140;

function FeedItem({ post }: { post: Post }) {
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
      <PostActions post={post} />

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

  emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { color: colors.white, fontSize: 16, fontWeight: "700", marginBottom: 8 },
  emptyText: { color: colors.gray, fontSize: 14, textAlign: "center", lineHeight: 20 },
});
