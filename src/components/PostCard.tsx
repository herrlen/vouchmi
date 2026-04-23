// src/components/PostCard.tsx
import { View, Text, Pressable, StyleSheet, Alert, ActionSheetIOS, Platform, Share } from "react-native";
import { router } from "expo-router";
import { colors } from "../constants/theme";
import LinkEmbed from "./LinkEmbed";
import CreatorBadge from "./CreatorBadge";
import { moderation, isCreator, type Post } from "../lib/api";
import { useAuth } from "../lib/store";

type Props = { post: Post; onLike: (id: string) => void; onPress?: () => void; onHide?: (id: string) => void };

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "gerade eben";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function PostCard({ post, onLike, onPress, onHide }: Props) {
  const me = useAuth((s) => s.user);
  const isOwn = me?.id === post.author.id;

  const openMenu = () => {
    const options = isOwn
      ? ["Weiterleiten", "Abbrechen"]
      : ["Weiterleiten", "Post melden", "Nutzer blockieren", "Abbrechen"];
    const cancelIdx = options.length - 1;

    const handle = (idx: number) => {
      if (idx === 0) shareLink();
      else if (!isOwn && idx === 1) reportPost();
      else if (!isOwn && idx === 2) blockUser();
    };

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIdx, destructiveButtonIndex: !isOwn ? 1 : undefined },
        handle,
      );
    } else {
      Alert.alert("Aktionen", undefined, options.map((o, i) => ({
        text: o,
        style: i === cancelIdx ? "cancel" : i === 1 && !isOwn ? "destructive" : "default",
        onPress: () => handle(i),
      })));
    }
  };

  const shareLink = async () => {
    try {
      await Share.share({
        message: post.link_affiliate_url
          ? `${post.content}\n${post.link_affiliate_url}`
          : post.content,
      });
    } catch {}
  };

  const reportPost = () => {
    const reasons: { label: string; value: "spam" | "abuse" | "illegal" | "sexual" | "other" }[] = [
      { label: "Spam", value: "spam" },
      { label: "Beleidigung / Hass", value: "abuse" },
      { label: "Illegale Inhalte", value: "illegal" },
      { label: "Sexuelle Inhalte", value: "sexual" },
      { label: "Sonstiges", value: "other" },
    ];
    Alert.alert("Post melden", "Warum möchtest du diesen Post melden?", [
      ...reasons.map((r) => ({
        text: r.label,
        onPress: async () => {
          try {
            await moderation.report({ target_type: "post", target_id: post.id, reason: r.value });
            onHide?.(post.id);
            Alert.alert("Danke", "Wir prüfen die Meldung innerhalb von 24 Stunden.");
          } catch (e: any) {
            Alert.alert("Fehler", e.message);
          }
        },
      })),
      { text: "Abbrechen", style: "cancel" },
    ]);
  };

  const blockUser = () => {
    Alert.alert(
      "Nutzer blockieren",
      `${post.author.display_name ?? post.author.username} wird für dich unsichtbar. Fortfahren?`,
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Blockieren",
          style: "destructive",
          onPress: async () => {
            try {
              await moderation.block(post.author.id);
              onHide?.(post.id);
            } catch (e: any) {
              Alert.alert("Fehler", e.message);
            }
          },
        },
      ],
    );
  };

  const authorName = post.author.display_name ?? post.author.username;

  return (
    <Pressable
      style={s.card}
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Empfehlung von ${authorName}: ${post.content?.slice(0, 80)}${post.content?.length > 80 ? "..." : ""}. ${post.like_count} Likes, ${post.comment_count} Kommentare`}
      accessibilityHint="Oeffnet die Empfehlung"
    >
      <View style={s.header}>
        <View style={[s.avatar, { backgroundColor: post.author.display_name ? stringColor(post.author.display_name) : colors.accent }]}>
          <Text style={s.avatarText}>{(post.author.display_name ?? post.author.username)[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={s.name}>{post.author.display_name ?? post.author.username}</Text>
            {isCreator(post.author) && <CreatorBadge size="sm" />}
          </View>
          <Text style={s.time}>{timeAgo(post.created_at)}</Text>
        </View>
        <Pressable onPress={openMenu} hitSlop={10} style={s.menuBtn} accessibilityRole="button" accessibilityLabel="Weitere Optionen">
          <Text style={s.menuDots} accessibilityElementsHidden>⋯</Text>
        </Pressable>
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
        <Pressable style={s.action} onPress={() => onLike(post.id)} accessibilityRole="button" accessibilityLabel={`${post.is_liked ? "Gefaellt mir nicht mehr" : "Gefaellt mir"}${post.like_count ? `, ${post.like_count} Likes` : ""}`}>
          <Text style={s.actionText}>♡ {post.like_count || ""}</Text>
        </Pressable>
        <Pressable style={s.action} onPress={() => router.push(`/post/${post.id}`)} accessibilityRole="button" accessibilityLabel={`Kommentare${post.comment_count ? `, ${post.comment_count}` : ""}`}>
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
  menuBtn: { padding: 4 },
  menuDots: { color: colors.gray, fontSize: 22, lineHeight: 22 },
});
