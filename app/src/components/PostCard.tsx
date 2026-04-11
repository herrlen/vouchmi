// src/components/PostCard.tsx
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors } from "../constants/theme";
import LinkEmbed from "./LinkEmbed";
import type { Post } from "../lib/api";

type Props = { post: Post; onLike: (id: string) => void; onPress?: () => void };

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "gerade eben";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function PostCard({ post, onLike, onPress }: Props) {
  return (
    <Pressable style={s.card} onPress={onPress}>
      <View style={s.header}>
        <View style={[s.avatar, { backgroundColor: post.author.display_name ? stringColor(post.author.display_name) : colors.accent }]}>
          <Text style={s.avatarText}>{(post.author.display_name ?? post.author.username)[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{post.author.display_name ?? post.author.username}</Text>
          <Text style={s.time}>{timeAgo(post.created_at)}</Text>
        </View>
      </View>

      <Text style={s.content}>{post.content}</Text>

      {post.link_url && post.link_affiliate_url && (
        <LinkEmbed
          postId={post.id}
          communityId={post.community_id}
          url={post.link_url}
          affiliateUrl={post.link_affiliate_url}
          title={post.link_title}
          image={post.link_image}
          price={post.link_price}
          domain={post.link_domain}
        />
      )}

      <View style={s.actions}>
        <Pressable style={s.action} onPress={() => onLike(post.id)}>
          <Text style={s.actionText}>♡ {post.like_count || ""}</Text>
        </Pressable>
        <Pressable style={s.action}>
          <Text style={s.actionText}>💬 {post.comment_count || ""}</Text>
        </Pressable>
        {post.click_count > 0 && (
          <Text style={[s.actionText, { marginLeft: "auto" }]}>🔗 {post.click_count} Klicks</Text>
        )}
      </View>
    </Pressable>
  );
}

function stringColor(s: string) {
  const c = ["#00D4AA", "#6366F1", "#EC4899", "#F59E0B", "#8B5CF6", "#14B8A6"];
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return c[Math.abs(h) % c.length];
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, marginBottom: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  name: { color: colors.white, fontWeight: "600", fontSize: 15 },
  time: { color: colors.grayDark, fontSize: 12, marginTop: 1 },
  content: { color: colors.white, fontSize: 15, lineHeight: 22 },
  actions: { flexDirection: "row", marginTop: 12, gap: 20 },
  action: { paddingVertical: 4 },
  actionText: { color: colors.gray, fontSize: 14 },
});
