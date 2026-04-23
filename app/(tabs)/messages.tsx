import { useCallback } from "react";
import { View, Text, Pressable, StyleSheet, FlatList, Image, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { MessageCircle } from "lucide-react-native";
import { colors } from "../../src/constants/theme";
import { useMessages } from "../../src/lib/messages-store";
import { useAuth } from "../../src/lib/store";
import CreatorBadge from "../../src/components/CreatorBadge";
import type { DmConversation } from "../../src/lib/api";

function timeAgo(dateStr: string): string {
  const m = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (m < 1) return "jetzt";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(dateStr).toLocaleDateString("de-DE", { day: "numeric", month: "short" });
}

function RoleBadge({ role, isActive }: { role: string; isActive: boolean }) {
  if (role === "influencer" && isActive) {
    return <CreatorBadge size="sm" />;
  }
  if (role === "brand" && isActive) {
    return <View style={[s.roleBadge, { backgroundColor: colors.indigo + "20" }]}><Text style={[s.roleBadgeText, { color: colors.indigo }]}>Brand</Text></View>;
  }
  return null;
}

function ConversationItem({ item, meId }: { item: DmConversation; meId: string }) {
  const other = item.other_user;
  const initial = (other.display_name ?? other.username ?? "?")[0]?.toUpperCase() ?? "?";
  const lastMsg = item.last_message;
  const isUnread = item.unread_count > 0;
  const isMeSender = lastMsg?.sender_id === meId;
  const preview = lastMsg
    ? (isMeSender ? "Du: " : "") + lastMsg.content
    : "Noch keine Nachricht";

  return (
    <Pressable
      style={s.convItem}
      onPress={() => router.push({ pathname: "/messages/[userId]", params: { userId: other.id } })}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${other.display_name ?? other.username}${isUnread ? `, ${item.unread_count} ungelesene Nachrichten` : ""}. ${preview}`}
      accessibilityHint="Oeffnet die Konversation"
    >
      {other.avatar_url ? (
        <Image source={{ uri: other.avatar_url }} style={s.avatar} />
      ) : (
        <View style={[s.avatar, s.avatarFallback]}>
          <Text style={s.avatarInitial}>{initial}</Text>
        </View>
      )}

      <View style={s.convContent}>
        <View style={s.convTopRow}>
          <Text style={[s.convName, isUnread && s.convNameBold]} numberOfLines={1}>
            {other.display_name ?? other.username}
          </Text>
          <RoleBadge role={other.role} isActive={other.is_active} />
          <View style={{ flex: 1 }} />
          {lastMsg && (
            <Text style={s.convTime}>{timeAgo(lastMsg.created_at)}</Text>
          )}
        </View>
        <View style={s.convBottomRow}>
          <Text style={[s.convPreview, isUnread && s.convPreviewBold]} numberOfLines={1}>
            {preview}
          </Text>
          {isUnread && <View style={s.unreadDot} />}
        </View>
      </View>
    </Pressable>
  );
}

export default function MessagesScreen() {
  const me = useAuth((s) => s.user);
  const { conversations, loadingConversations, loadConversations } = useMessages();

  useFocusEffect(useCallback(() => {
    loadConversations();
  }, [loadConversations]));

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Nachrichten</Text>
      </View>

      {loadingConversations && conversations.length === 0 ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <ConversationItem item={item} meId={me?.id ?? ""} />}
          contentContainerStyle={conversations.length === 0 ? { flex: 1 } : { paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={loadingConversations} onRefresh={loadConversations} tintColor={colors.accent} />
          }
          ListEmptyComponent={
            <View style={s.emptyContainer}>
              <MessageCircle color={colors.grayDark} size={56} strokeWidth={1.2} />
              <Text style={s.emptyTitle}>Noch keine Nachrichten</Text>
              <Text style={s.emptyBody}>
                Nachrichten erscheinen hier, sobald du mit jemandem schreibst. Besuche ein Profil und tippe auf "Nachricht".
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { color: colors.white, fontSize: 28, fontWeight: "800" },

  convItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: { backgroundColor: colors.accent, justifyContent: "center", alignItems: "center" },
  avatarInitial: { color: "#fff", fontSize: 20, fontWeight: "700" },

  convContent: { flex: 1 },
  convTopRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  convName: { color: colors.white, fontSize: 15, fontWeight: "500", maxWidth: "50%" },
  convNameBold: { fontWeight: "700" },
  convTime: { color: colors.grayDark, fontSize: 12 },
  convBottomRow: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  convPreview: { color: colors.gray, fontSize: 14, flex: 1 },
  convPreviewBold: { color: colors.white, fontWeight: "600" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, marginLeft: 8 },

  roleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  roleBadgeText: { fontSize: 10, fontWeight: "700" },

  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40, gap: 12 },
  emptyTitle: { color: colors.white, fontSize: 20, fontWeight: "700" },
  emptyBody: { color: colors.gray, fontSize: 14, textAlign: "center", lineHeight: 20 },
});
