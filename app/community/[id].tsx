import { useEffect, useState, useRef } from "react";
import { View, Text, FlatList, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, Alert, Linking, Share, Image, ActionSheetIOS } from "react-native";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MessageSquare, Gift, Mail, Heart, MessageCircle, Share2, ExternalLink, ChevronLeft, Settings } from "lucide-react-native";
import { useAuth, useApp } from "../../src/lib/store";
import LinkEmbed from "../../src/components/LinkEmbed";
import BottomBar from "../../src/components/BottomBar";
import { colors } from "../../src/constants/theme";
import { communities as communitiesApi, feed as feedApi, links as linksApi, type Post } from "../../src/lib/api";

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
      setIsOwnerOrAdmin(myRole === "owner" || myRole === "admin" || myRole === "moderator");
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

  const openShop = async (post: Post) => {
    const url = post.link_affiliate_url ?? post.link_url;
    if (!url) return;
    linksApi.trackClick({ post_id: post.id, community_id: post.community_id, original_url: post.link_url ?? url, affiliate_url: url }).catch(() => {});
    try { await Linking.openURL(url); } catch {}
  };

  const inviteFriends = async () => {
    if (!id) return;
    try {
      const { invite_link } = await communitiesApi.invite(id);
      await Share.share({ message: `Hey! Tritt meiner TrusCart-Community bei:\n${invite_link}` });
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    }
  };

  const topTabs: { key: Tab; label: string; Icon: any }[] = [
    { key: "feed", label: "Feed", Icon: null },
    { key: "chat", label: "Chat", Icon: MessageSquare },
    { key: "drops", label: "Drops", Icon: Gift },
    { key: "messages", label: "", Icon: Mail },
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
          {isOwnerOrAdmin && (
            <Pressable onPress={() => router.push(`/community-settings?id=${id}`)} hitSlop={10} style={s.headerIconBtn}>
              <Settings color={colors.white} size={20} strokeWidth={1.8} />
            </Pressable>
          )}
          <Pressable onPress={inviteFriends} hitSlop={10} style={s.headerIconBtn}>
            <Share2 color={colors.white} size={20} strokeWidth={1.8} />
          </Pressable>
        </View>
      </View>

      {/* Top Tabs */}
      <View style={s.topTabs}>
        {topTabs.map(({ key, label, Icon }) => (
          <Pressable key={key} style={[s.topTab, tab === key && s.topTabOn]} onPress={() => setTab(key)}>
            {Icon ? (
              <Icon color={tab === key ? colors.white : colors.grayDark} size={18} strokeWidth={1.8} />
            ) : null}
            {label ? (
              <Text style={[s.topTabText, tab === key && s.topTabTextOn]}>{label}</Text>
            ) : null}
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
            contentContainerStyle={{ paddingBottom: 20 }}
            onRefresh={() => id && loadFeed(id)}
            refreshing={false}
            ListEmptyComponent={<Text style={s.emptyText}>Noch keine Posts. Nutze + um etwas zu teilen!</Text>}
            renderItem={({ item }) => (
              <FeedPost post={item} onLike={likePost} onOpenShop={openShop} onRefresh={() => id && loadFeed(id)} canModerate={isOwnerOrAdmin} communityId={id!} />
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
            <Gift color={colors.grayDark} size={48} strokeWidth={1.2} />
            <Text style={s.emptyTitle}>Sponsored Drops</Text>
            <Text style={s.emptyText}>Hier erscheinen exklusive Angebote von Marken.</Text>
          </View>
        )}

        {tab === "messages" && (
          <View style={s.center}>
            <Mail color={colors.grayDark} size={48} strokeWidth={1.2} />
            <Text style={s.emptyTitle}>Nachrichten</Text>
            <Text style={s.emptyText}>Private Nachrichten an Community-Mitglieder kommen bald.</Text>
          </View>
        )}
      </KeyboardAvoidingView>

      <BottomBar communityId={id} />
    </SafeAreaView>
  );
}

function FeedPost({ post, onLike, onOpenShop, onRefresh, canModerate, communityId }: {
  post: Post;
  onLike: (id: string) => void;
  onOpenShop: (post: Post) => void;
  onRefresh: () => void;
  canModerate: boolean;
  communityId: string;
}) {
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

  return (
    <View style={s.post}>
      <View style={s.postTop}>
        {post.author.avatar_url ? (
          <Image source={{ uri: post.author.avatar_url }} style={s.postAvatar} />
        ) : (
          <View style={[s.postAvatar, s.postAvatarFallback]}>
            <Text style={s.postAvatarInitial}>{initial}</Text>
          </View>
        )}
        <View style={s.postMeta}>
          <Text style={s.postAuthor}>{post.author.display_name ?? post.author.username}</Text>
          <Text style={s.postTime}>@{post.author.username} · {timeAgo(post.created_at)}</Text>
        </View>
        {canModerate && (
          <Pressable onPress={openModMenu} hitSlop={10} style={s.modBtn}>
            <Text style={s.modDots}>⋯</Text>
          </Pressable>
        )}
      </View>

      {!!post.content && <Text style={s.postContent}>{post.content}</Text>}

      {post.link_image && (
        <Pressable onPress={() => onOpenShop(post)}>
          <Image source={{ uri: post.link_image }} style={s.postImage} />
        </Pressable>
      )}

      {post.link_title && (
        <Pressable style={s.linkCard} onPress={() => onOpenShop(post)}>
          <View style={{ flex: 1 }}>
            <Text style={s.linkTitle} numberOfLines={2}>{post.link_title}</Text>
            <View style={s.linkMetaRow}>
              <ExternalLink color={colors.accent} size={11} strokeWidth={1.8} />
              {post.link_domain && <Text style={s.linkDomain}>{post.link_domain}</Text>}
            </View>
          </View>
          {post.link_price != null && <Text style={s.linkPrice}>{post.link_price.toFixed(2)} €</Text>}
        </Pressable>
      )}

      <View style={s.actions}>
        <Pressable style={s.actionBtn} onPress={() => onLike(post.id)} hitSlop={6}>
          <Heart color={colors.white} size={20} strokeWidth={1.8} />
          {post.like_count > 0 && <Text style={s.actionCount}>{post.like_count}</Text>}
        </Pressable>
        <Pressable style={s.actionBtn} onPress={() => router.push(`/post/${post.id}`)} hitSlop={6}>
          <MessageCircle color={colors.white} size={20} strokeWidth={1.8} />
          {post.comment_count > 0 && <Text style={s.actionCount}>{post.comment_count}</Text>}
        </Pressable>
        <Pressable style={s.actionBtn} hitSlop={6}>
          <Share2 color={colors.white} size={20} strokeWidth={1.8} />
        </Pressable>
        {post.link_affiliate_url && (
          <Pressable style={s.shopBtn} onPress={() => onOpenShop(post)}>
            <Text style={s.shopBtnText}>Zum Produkt</Text>
            <ExternalLink color={colors.bg} size={13} strokeWidth={2} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, gap: 10 },
  backBtn: { minWidth: 44, minHeight: 44, justifyContent: "center" },
  headerTitle: { flex: 1, color: colors.white, fontSize: 17, fontWeight: "600" },
  headerIcons: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerIconBtn: { minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "center" },
  topTabs: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: colors.border },
  topTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 12, minHeight: 44, borderBottomWidth: 2, borderBottomColor: "transparent" },
  topTabOn: { borderBottomColor: colors.accent },
  topTabText: { color: colors.grayDark, fontSize: 14, fontWeight: "600" },
  topTabTextOn: { color: colors.white },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32, gap: 8 },
  emptyTitle: { color: colors.white, fontSize: 16, fontWeight: "700" },
  emptyText: { color: colors.gray, textAlign: "center", lineHeight: 20, fontSize: 13 },

  // Posts
  post: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  postTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  postAvatar: { width: 36, height: 36, borderRadius: 18 },
  postAvatarFallback: { backgroundColor: colors.accent, justifyContent: "center", alignItems: "center" },
  postAvatarInitial: { color: colors.bg, fontWeight: "800", fontSize: 15 },
  postMeta: { flex: 1 },
  postAuthor: { color: colors.white, fontSize: 14, fontWeight: "600" },
  postTime: { color: colors.gray, fontSize: 11, marginTop: 1 },
  postContent: { color: colors.white, fontSize: 14, lineHeight: 19, marginBottom: 6 },
  postImage: { width: "100%", aspectRatio: 1, borderRadius: 10, backgroundColor: colors.bgCard, marginBottom: 6 },
  linkCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bgCard, borderRadius: 10, padding: 10, marginBottom: 6, gap: 10 },
  linkTitle: { color: colors.white, fontSize: 13, fontWeight: "600", lineHeight: 17 },
  linkMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  linkDomain: { color: colors.gray, fontSize: 11 },
  linkPrice: { color: colors.accent, fontSize: 16, fontWeight: "700" },
  actions: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 4 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5, minHeight: 44, paddingVertical: 4 },
  actionCount: { color: colors.white, fontSize: 13 },
  shopBtn: { flexDirection: "row", alignItems: "center", gap: 5, marginLeft: "auto", backgroundColor: colors.accent, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16 },
  shopBtnText: { color: colors.bg, fontSize: 12, fontWeight: "700" },
  modBtn: { minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "flex-end" },
  modDots: { color: colors.gray, fontSize: 20, lineHeight: 20 },
  muteBanner: { backgroundColor: "#FF3B3020", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  muteBannerText: { color: "#FF3B30", fontSize: 13, fontWeight: "600", textAlign: "center" },

  // Chat
  msg: { maxWidth: "80%", padding: 10, borderRadius: 16, marginBottom: 4 },
  msgMe: { alignSelf: "flex-end", backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  msgOther: { alignSelf: "flex-start", backgroundColor: colors.bgCard, borderBottomLeftRadius: 4 },
  msgName: { color: colors.accent, fontSize: 11, fontWeight: "600", marginBottom: 2 },
  msgText: { color: colors.white, fontSize: 14, lineHeight: 19 },
  chatInput: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 10, borderTopWidth: 0.5, borderTopColor: colors.border },
  chatTextInput: { flex: 1, backgroundColor: colors.bgInput, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, color: colors.white, fontSize: 14, maxHeight: 100 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accent, justifyContent: "center", alignItems: "center" },
  sendBtnText: { color: colors.bg, fontSize: 18, fontWeight: "bold" },
});
