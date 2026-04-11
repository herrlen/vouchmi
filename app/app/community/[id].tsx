// app/community/[id].tsx
import { useEffect, useState, useRef } from "react";
import { View, Text, FlatList, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, Alert, Linking } from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useAuth, useApp } from "../../src/lib/store";
import PostCard from "../../src/components/PostCard";
import LinkEmbed from "../../src/components/LinkEmbed";
import { colors } from "../../src/constants/theme";

type Tab = "feed" | "chat" | "drops";

export default function CommunityDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("feed");
  const [input, setInput] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const { feed, messages, loadFeed, createPost, likePost, loadMessages, sendMessage, startPolling, stopPolling } = useApp();
  const user = useAuth((s) => s.user);
  const nav = useNavigation();
  const chatRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id) return;
    loadFeed(id);
    return () => stopPolling();
  }, [id]);

  useEffect(() => {
    if (tab === "chat" && id) { startPolling(id); }
    else { stopPolling(); }
  }, [tab, id]);

  useEffect(() => {
    if (tab === "chat") setTimeout(() => chatRef.current?.scrollToEnd({ animated: true }), 200);
  }, [messages.length]);

  const handleSend = async () => {
    if (!input.trim() || !id) return;
    if (tab === "feed") {
      await createPost(id, input.trim(), linkUrl || undefined);
      setLinkUrl("");
      setShowLinkInput(false);
    } else {
      await sendMessage(id, input.trim());
    }
    setInput("");
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      {/* Tabs */}
      <View style={s.tabs}>
        {(["feed", "chat", "drops"] as Tab[]).map((t) => (
          <Pressable key={t} style={[s.tab, tab === t && s.tabOn]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextOn]}>
              {t === "feed" ? "📋 Feed" : t === "chat" ? "💬 Chat" : "🎁 Drops"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Feed */}
      {tab === "feed" && (
        <FlatList
          data={feed}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16 }}
          onRefresh={() => id && loadFeed(id)}
          refreshing={false}
          renderItem={({ item }) => <PostCard post={item} onLike={likePost} />}
          ListEmptyComponent={<Text style={s.emptyText}>Noch keine Posts. Teile etwas!</Text>}
        />
      )}

      {/* Chat */}
      {tab === "chat" && (
        <FlatList
          ref={chatRef}
          data={messages}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16 }}
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
      )}

      {/* Drops */}
      {tab === "drops" && (
        <View style={s.center}>
          <Text style={s.emptyEmoji}>🎁</Text>
          <Text style={s.emptyTitle}>Sponsored Drops</Text>
          <Text style={s.emptyText}>Hier erscheinen exklusive Angebote von Marken für diese Community.</Text>
        </View>
      )}

      {/* Input */}
      {(tab === "feed" || tab === "chat") && (
        <View style={s.inputArea}>
          {tab === "feed" && showLinkInput && (
            <TextInput style={s.linkInput} placeholder="Link einfügen (z.B. amazon.de/...)"
              placeholderTextColor={colors.grayDark} value={linkUrl} onChangeText={setLinkUrl}
              autoCapitalize="none" autoCorrect={false} keyboardType="url" />
          )}
          <View style={s.inputRow}>
            {tab === "feed" && (
              <Pressable style={s.linkBtn} onPress={() => setShowLinkInput(!showLinkInput)}>
                <Text style={s.linkBtnText}>🔗</Text>
              </Pressable>
            )}
            <TextInput style={s.input} placeholder={tab === "feed" ? "Was hast du entdeckt?" : "Nachricht..."}
              placeholderTextColor={colors.grayDark} value={input} onChangeText={setInput} multiline />
            <Pressable style={[s.sendBtn, !input.trim() && { opacity: 0.4 }]} onPress={handleSend} disabled={!input.trim()}>
              <Text style={s.sendBtnText}>↑</Text>
            </Pressable>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabOn: { borderBottomWidth: 2, borderBottomColor: colors.accent },
  tabText: { color: colors.grayDark, fontSize: 14, fontWeight: "600" },
  tabTextOn: { color: colors.white },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { color: colors.white, fontSize: 18, fontWeight: "bold", marginTop: 12 },
  emptyText: { color: colors.gray, textAlign: "center", marginTop: 8, lineHeight: 20 },
  msg: { maxWidth: "80%", padding: 12, borderRadius: 18, marginBottom: 6 },
  msgMe: { alignSelf: "flex-end", backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  msgOther: { alignSelf: "flex-start", backgroundColor: colors.bgCard, borderBottomLeftRadius: 4 },
  msgName: { color: colors.accent, fontSize: 12, fontWeight: "600", marginBottom: 3 },
  msgText: { color: colors.white, fontSize: 15, lineHeight: 20 },
  inputArea: { borderTopWidth: 1, borderTopColor: colors.border, padding: 10 },
  linkInput: { backgroundColor: colors.bgInput, borderRadius: 10, padding: 12, color: colors.white, fontSize: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  linkBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgCard, justifyContent: "center", alignItems: "center" },
  linkBtnText: { fontSize: 18 },
  input: { flex: 1, backgroundColor: colors.bgInput, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: colors.white, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, justifyContent: "center", alignItems: "center" },
  sendBtnText: { color: colors.bg, fontSize: 20, fontWeight: "bold" },
});
