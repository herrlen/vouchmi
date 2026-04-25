import { useEffect, useState, useRef } from "react";
import { View, Text, FlatList, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, Alert, Share, Image, ActionSheetIOS, Linking } from "react-native";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Menu } from "lucide-react-native";
import { useAuth, useApp } from "../../src/lib/store";
import LinkEmbed from "../../src/components/LinkEmbed";
import BottomBar from "../../src/components/BottomBar";
import PostActions from "../../src/components/PostActions";
import LinkCard from "../../src/components/LinkCard";
import { colors } from "../../src/constants/theme";
import { communities as communitiesApi, feed as feedApi, users as usersApi, type Post } from "../../src/lib/api";
import VSeal from "../../src/components/VSeal";

type Tab = "feed" | "chat" | "drops" | "messages";

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "gerade";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function CommunityDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("feed");
  const [input, setInput] = useState("");
  const [communityName, setCommunityName] = useState("");
  const [isOwnerOrAdmin, setIsOwnerOrAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [isFollowed, setIsFollowed] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mutedUntil, setMutedUntil] = useState<string | null>(null);
  const { feed, messages, loadFeed, likePost, loadMessages, sendMessage, startPolling, stopPolling } = useApp();
  const user = useAuth((s) => s.user);
  const chatRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id) return;
    loadFeed(id);
    communitiesApi.get(id).then((r) => {
      setCommunityName(r.community.name);
      const myRole = r.community.my_role;
      const memberFlag = !!(r.community as any).is_member || !!myRole;
      setIsOwnerOrAdmin(myRole === "owner" || myRole === "admin" || myRole === "moderator");
      setIsOwner(r.community.owner_id === user?.id);
      setIsMember(memberFlag);
      setIsFollowed(!!(r.community as any).is_followed);
    }).catch(() => {});
    communitiesApi.muteStatus(id).then((r) => { setIsMuted(r.muted); setMutedUntil(r.muted_until); }).catch(() => {});
    return () => stopPolling();
  }, [id]);

  useEffect(() => {
    if (tab === "chat" && id) startPolling(id);
    else stopPolling();
  }, [tab, id]);

  useEffect(() => {
    if (tab === "chat") setTimeout(() => chatRef.current?.scrollToEnd({ animated: true }), 200);
  }, [messages.length]);

  const handleChatSend = async () => {
    if (!input.trim() || !id) return;
    try {
      await sendMessage(id, input.trim());
      setInput("");
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    }
  };

  const inviteFriends = async () => {
    if (!id) return;
    try {
      const { invite_link } = await communitiesApi.invite(id);
      await Share.share({ message: `Hey! Tritt meiner Vouchmi-Community bei:\n${invite_link}` });
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    }
  };

  const topTabs: { key: Tab; label: string }[] = [
    { key: "feed", label: "Feed" },
    { key: "chat", label: "Chat" },
    { key: "drops", label: "Drops" },
    { key: "messages", label: "Mail" },
  ];

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
          <ChevronLeft color={colors.white} size={24} strokeWidth={2} />
        </Pressable>
        <Text style={s.headerTitle} numberOfLines={1}>{communityName || "Community"}</Text>
        <View style={s.headerIcons}>
          {!isOwner && (
            <Pressable
              style={[s.followBtn, isMember && s.followBtnActive]}
              onPress={async () => {
                if (!id) return;
                try {
                  if (isMember) {
                    await communitiesApi.leave(id);
                    setIsMember(false);
                  } else {
                    await communitiesApi.join(id);
                    setIsMember(true);
                  }
                } catch (e: any) { Alert.alert("Fehler", e.message); }
              }}
              hitSlop={6}
            >
              <Text style={[s.followBtnText, isMember && s.followBtnTextActive]}>
                {isMember ? "Verlassen" : "Beitreten"}
              </Text>
            </Pressable>
          )}
          {!isOwner && !isMember && (
            <Pressable
              style={[s.followBtn, isFollowed && s.followBtnActive]}
              onPress={async () => {
                if (!id) return;
                try {
                  if (isFollowed) {
                    await communitiesApi.unfollow(id);
                    setIsFollowed(false);
                  } else {
                    await communitiesApi.follow(id);
                    setIsFollowed(true);
                  }
                } catch (e: any) { Alert.alert("Fehler", e.message); }
              }}
              hitSlop={6}
            >
              <Text style={[s.followBtnText, isFollowed && s.followBtnTextActive]}>
                {isFollowed ? "Entfolgen" : "Folgen"}
              </Text>
            </Pressable>
          )}
          {isOwnerOrAdmin && (
            <Pressable onPress={() => router.push(`/community-settings?id=${id}`)} hitSlop={10} style={s.headerIconBtn}>
              <Menu color={colors.white} size={22} strokeWidth={1.8} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Top Tabs */}
      <View style={s.topTabs} accessibilityRole="tablist">
        {topTabs.map(({ key, label }) => (
          <Pressable key={key} style={[s.topTab, tab === key && s.topTabOn]} onPress={() => setTab(key)} accessibilityRole="tab" accessibilityState={{ selected: tab === key }} accessibilityLabel={label}>
            <Text style={[s.topTabText, tab === key && s.topTabTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
        {isMuted && (
          <View style={s.muteBanner}>
            <Text style={s.muteBannerText}>Du bist stumm geschaltet{mutedUntil ? ` bis ${new Date(mutedUntil).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}` : ""}.</Text>
          </View>
        )}

        {tab === "feed" && (
          <FlatList
            data={feed}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
            onRefresh={() => id && loadFeed(id)}
            refreshing={false}
            ListEmptyComponent={<Text style={s.emptyText}>Noch keine Posts. Nutze + um etwas zu teilen!</Text>}
            renderItem={({ item }) => (
              <FeedPost post={item} onRefresh={() => id && loadFeed(id)} canModerate={isOwnerOrAdmin} communityId={id!} />
            )}
          />
        )}

        {tab === "chat" && (
          <>
            <FlatList
              ref={chatRef}
              data={messages}
              keyExtractor={(i) => i.id}
              contentContainerStyle={{ padding: 12 }}
              onContentSizeChange={() => chatRef.current?.scrollToEnd({ animated: false })}
              renderItem={({ item }) => {
                const isMe = item.sender.id === user?.id;
                return (
                  <View style={[s.msg, isMe ? s.msgMe : s.msgOther]}>
                    {!isMe && <Text style={s.msgName}>{item.sender.display_name ?? item.sender.username}</Text>}
                    <Text style={s.msgText}>{item.content}</Text>
                    {item.link_url && item.link_title && (
                      <LinkEmbed url={item.link_url} affiliateUrl={item.link_url}
                        title={item.link_title} image={item.link_image} price={item.link_price} compact />
                    )}
                  </View>
                );
              }}
            />
            <View style={s.chatInput}>
              <TextInput style={s.chatTextInput} placeholder="Nachricht..." placeholderTextColor={colors.grayDark}
                value={input} onChangeText={setInput} multiline maxLength={2000} />
              <Pressable style={[s.sendBtn, !input.trim() && { opacity: 0.4 }]} onPress={handleChatSend} disabled={!input.trim()}>
                <Text style={s.sendBtnText}>↑</Text>
              </Pressable>
            </View>
          </>
        )}

        {tab === "drops" && (
          <View style={s.center}>
            <Text style={{ fontSize: 42 }}>🎁</Text>
            <Text style={s.emptyTitle}>Sponsored Drops</Text>
            <Text style={s.emptyText}>Hier erscheinen exklusive Angebote von Marken.</Text>
          </View>
        )}

        {tab === "messages" && (
          <View style={s.center}>
            <Text style={{ fontSize: 42 }}>✉︎</Text>
            <Text style={s.emptyTitle}>Nachrichten</Text>
            <Text style={s.emptyText}>Private Nachrichten an Community-Mitglieder kommen bald.</Text>
          </View>
        )}
      </KeyboardAvoidingView>

      <BottomBar communityId={id} />
    </SafeAreaView>
  );
}

function FeedPost({ post, onRefresh, canModerate, communityId }: {
  post: Post;
  onRefresh: () => void;
  canModerate: boolean;
  communityId: string;
}) {
  const me = useAuth((s) => s.user);
  const isOwnPost = me?.id === post.author.id;
  const [following, setFollowing] = useState(false);
  const [checked, setChecked] = useState(false);

  // Check follow status once
  if (!checked && !isOwnPost) {
    setChecked(true);
    usersApi.profile(post.author.id).then((r) => setFollowing(r.is_following)).catch(() => {});
  }

  const toggleFollow = async () => {
    try {
      if (following) {
        await usersApi.unfollow(post.author.id);
        setFollowing(false);
      } else {
        await usersApi.follow(post.author.id);
        setFollowing(true);
      }
    } catch (e: any) { Alert.alert("Fehler", e.message); }
  };

  const openModMenu = () => {
    const opts = ["Beitrag ausblenden", "Beitrag löschen", "Abbrechen"];
    const handle = async (idx: number) => {
      if (idx === 2) return;
      try {
        if (idx === 0) await communitiesApi.hidePost(communityId, post.id);
        else await communitiesApi.deletePost(communityId, post.id);
        onRefresh();
      } catch (e: any) { Alert.alert("Fehler", e.message); }
    };
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions({ options: opts, cancelButtonIndex: 2, destructiveButtonIndex: 1 }, handle);
    } else {
      Alert.alert("Moderation", undefined, opts.map((o, i) => ({ text: o, style: i === 2 ? "cancel" : i === 1 ? "destructive" : "default", onPress: () => handle(i) })));
    }
  };
  const initial = (post.author.display_name ?? post.author.username)[0]?.toUpperCase() ?? "?";

  // Role-based badge color: green=user, orange=influencer, purple=brand
  const role = (post.author as any).role ?? "user";
  const badgeColor = role === "influencer" ? "#F59E0B" : role === "brand" ? "#6366F1" : "#10B981";
  const badgeLabel = role === "influencer" ? "Influencer" : role === "brand" ? "Brand" : "Nutzer";

  return (
    <View style={s.card}>
      {/* Header: Avatar + Name + Badge */}
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
        <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => router.push(`/user/${post.author.id}`)}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Text style={s.cardAuthor} numberOfLines={1}>{post.author.display_name ?? post.author.username}</Text>
            {post.author.tier && post.author.tier !== "none" && (
              <VSeal tier={post.author.tier as any} opacity={post.author.tier_badge_opacity ?? 1} size="xs" />
            )}
          </View>
          <Text style={s.cardTime}>{timeAgo(post.created_at)}</Text>
        </Pressable>

        {/* Role badge */}
        <View style={[s.roleBadge, { backgroundColor: badgeColor + "18" }]}>
          <View style={[s.roleDot, { backgroundColor: badgeColor }]} />
          <Text style={[s.roleBadgeText, { color: badgeColor }]}>{badgeLabel}</Text>
        </View>

        {!isOwnPost && checked && (
          <Pressable style={[s.cardFollowBtn, following && s.cardFollowBtnActive]} onPress={toggleFollow} hitSlop={6}>
            <Text style={[s.cardFollowText, following && s.cardFollowTextActive]}>{following ? "Entfolgen" : "Folgen"}</Text>
          </Pressable>
        )}
        {canModerate && (
          <Pressable onPress={openModMenu} hitSlop={10} style={s.modBtn}>
            <Text style={s.modDots}>⋯</Text>
          </Pressable>
        )}
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

      {/* Title + Price row */}
      {(post.link_title || post.link_price != null) && (
        <View style={s.cardTitleRow}>
          {post.link_title && <Text style={s.cardTitle} numberOfLines={2}>{post.link_title}</Text>}
          {post.link_price != null && <Text style={s.cardPrice}>{post.link_price.toFixed(2)} €</Text>}
        </View>
      )}

      {/* Description */}
      {!!post.content && <Text style={s.cardDesc}>{post.content}</Text>}

      {/* Actions */}
      <PostActions post={post} />

      {/* Reco button */}
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
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, gap: 10 },
  backBtn: { minWidth: 44, minHeight: 44, justifyContent: "center" },
  headerTitle: { flex: 1, color: colors.white, fontSize: 17, fontWeight: "600" },
  headerIcons: { flexDirection: "row", alignItems: "center", gap: 8, marginLeft: "auto" },
  headerIconBtn: { minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "center" },
  followBtn: { backgroundColor: colors.accent, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, minHeight: 32, justifyContent: "center" },
  followBtnActive: { backgroundColor: colors.bgInput },
  followBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  followBtnTextActive: { color: colors.white },
  topTabs: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: colors.border },
  topTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 12, minHeight: 44, borderBottomWidth: 2, borderBottomColor: "transparent" },
  topTabOn: { borderBottomColor: colors.accent },
  topTabText: { color: colors.grayDark, fontSize: 14, fontWeight: "600" },
  topTabTextOn: { color: colors.white, fontWeight: "700" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32, gap: 8 },
  emptyTitle: { color: colors.white, fontSize: 16, fontWeight: "700" },
  emptyText: { color: colors.gray, textAlign: "center", lineHeight: 20, fontSize: 13 },

  // Card-based Posts
  card: { backgroundColor: "#141926", borderRadius: 24, marginHorizontal: 12, marginBottom: 12, overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 16, paddingBottom: 10 },
  cardAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  cardAvatarInitial: { color: "#fff", fontWeight: "800", fontSize: 16 },
  cardAuthor: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  cardTime: { color: "#64748B", fontSize: 12, marginTop: 1 },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  roleDot: { width: 8, height: 8, borderRadius: 4 },
  roleBadgeText: { fontSize: 11, fontWeight: "700" },
  cardFollowBtn: { backgroundColor: colors.accent, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, minHeight: 28, justifyContent: "center" },
  cardFollowBtnActive: { backgroundColor: "#1E2235" },
  cardFollowText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  cardFollowTextActive: { color: "#64748B" },
  cardImage: { width: "100%", aspectRatio: 4 / 5, backgroundColor: "#FFFFFF", resizeMode: "contain", borderRadius: 0, overflow: "hidden" },
  cardTitleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  cardTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "800", flex: 1, lineHeight: 22 },
  cardPrice: { color: "#F59E0B", fontSize: 16, fontWeight: "800" },
  cardDesc: { color: "#CBD5E1", fontSize: 14, lineHeight: 20, paddingHorizontal: 16, paddingTop: 6, fontStyle: "italic" },
  recoBtn: { backgroundColor: "#F59E0B", marginHorizontal: 16, marginBottom: 16, marginTop: 4, paddingVertical: 12, borderRadius: 14, alignItems: "center", minHeight: 44, justifyContent: "center" },
  recoBtnText: { color: "#1A1D2E", fontSize: 14, fontWeight: "800" },
  modBtn: { minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "flex-end" },
  modDots: { color: "#64748B", fontSize: 20, lineHeight: 20 },
  muteBanner: { backgroundColor: "#EF444420", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  muteBannerText: { color: "#EF4444", fontSize: 13, fontWeight: "600", textAlign: "center" },

  // Chat
  msg: { maxWidth: "80%", padding: 10, borderRadius: 16, marginBottom: 4 },
  msgMe: { alignSelf: "flex-end", backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  msgOther: { alignSelf: "flex-start", backgroundColor: colors.bgCard, borderBottomLeftRadius: 4 },
  msgName: { color: colors.accent, fontSize: 11, fontWeight: "600", marginBottom: 2 },
  msgText: { color: colors.white, fontSize: 14, lineHeight: 19 },
  chatInput: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 10, borderTopWidth: 0.5, borderTopColor: colors.border },
  chatTextInput: { flex: 1, backgroundColor: colors.bgInput, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, color: colors.white, fontSize: 14, maxHeight: 100 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accent, justifyContent: "center", alignItems: "center" },
  sendBtnText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
