import { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, Pressable, StyleSheet, FlatList, Image, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, ActionSheetIOS, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams, useFocusEffect } from "expo-router";
import { ChevronLeft, Send, MoreVertical } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { colors } from "../../src/constants/theme";
import { useMessages } from "../../src/lib/messages-store";
import { useAuth } from "../../src/lib/store";
import { users as usersApi, moderation } from "../../src/lib/api";
import CreatorBadge from "../../src/components/CreatorBadge";
import type { DmMessage } from "../../src/lib/api";

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Heute";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Gestern";
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "long" });
}

function shouldShowTimestamp(messages: DmMessage[], index: number): boolean {
  if (index === messages.length - 1) return true;
  const curr = messages[index];
  const next = messages[index + 1];
  if (curr.sender_id !== next.sender_id) return true;
  const diff = new Date(next.created_at).getTime() - new Date(curr.created_at).getTime();
  return diff > 60000; // > 1 minute apart
}

function shouldShowDateHeader(messages: DmMessage[], index: number): boolean {
  if (index === 0) return true;
  const curr = new Date(messages[index].created_at).toDateString();
  const prev = new Date(messages[index - 1].created_at).toDateString();
  return curr !== prev;
}

export default function ThreadScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const me = useAuth((s) => s.user);
  const { messagesById, loadThread, sendMessage, markAsRead, loadingThread } = useMessages();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);

  const messages = messagesById[userId ?? ""] ?? [];
  const isLoading = loadingThread === userId;

  // Load thread + user profile
  useFocusEffect(useCallback(() => {
    if (!userId) return;
    loadThread(userId);
    markAsRead(userId);
    usersApi.profile(userId).then((r) => setOtherUser(r.profile)).catch(() => {});
  }, [userId, loadThread, markAsRead]));

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!text.trim() || !userId || sending) return;
    const content = text.trim();
    setText("");
    setSending(true);
    try {
      await sendMessage(userId, content);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
      setText(content); // restore text on error
    } finally {
      setSending(false);
    }
  };

  const showMenu = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Abbrechen", "Melden", "Blockieren"],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 2,
        },
        (idx) => {
          if (idx === 1) handleReport();
          if (idx === 2) handleBlock();
        }
      );
    } else {
      Alert.alert("Optionen", undefined, [
        { text: "Melden", onPress: handleReport },
        { text: "Blockieren", style: "destructive", onPress: handleBlock },
        { text: "Abbrechen", style: "cancel" },
      ]);
    }
  };

  const handleReport = () => {
    if (!userId) return;
    Alert.alert(
      "Nutzer melden",
      "Warum moechtest du diese Person melden?",
      [
        { text: "Spam", onPress: () => doReport("spam") },
        { text: "Beleidigung", onPress: () => doReport("abuse") },
        { text: "Unangemessener Inhalt", onPress: () => doReport("sexual") },
        { text: "Abbrechen", style: "cancel" },
      ]
    );
  };

  const doReport = async (reason: "spam" | "abuse" | "sexual") => {
    try {
      await moderation.report({ target_type: "user", target_id: userId!, reason });
      Alert.alert("Gemeldet", "Danke fuer deine Meldung. Wir pruefen sie.");
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    }
  };

  const handleBlock = () => {
    Alert.alert(
      "Nutzer blockieren?",
      "Du wirst keine Nachrichten mehr von dieser Person erhalten.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Blockieren",
          style: "destructive",
          onPress: async () => {
            try {
              await moderation.block(userId!);
              Alert.alert("Blockiert", "Der Nutzer wurde blockiert.");
              router.back();
            } catch (e: any) {
              Alert.alert("Fehler", e.message);
            }
          },
        },
      ]
    );
  };

  const otherName = otherUser?.display_name ?? otherUser?.username ?? "";
  const otherInitial = otherName[0]?.toUpperCase() ?? "?";

  const renderMessage = ({ item, index }: { item: DmMessage; index: number }) => {
    const isMe = item.sender_id === me?.id;
    const showTime = shouldShowTimestamp(messages, index);
    const showDate = shouldShowDateHeader(messages, index);

    return (
      <View>
        {showDate && (
          <Text style={s.dateHeader}>{formatDate(item.created_at)}</Text>
        )}
        <View style={[s.bubbleRow, isMe ? s.bubbleRowRight : s.bubbleRowLeft]}>
          <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleOther]}>
            <Text style={[s.bubbleText, isMe ? s.bubbleTextMe : s.bubbleTextOther]}>
              {item.content}
            </Text>
          </View>
        </View>
        {showTime && (
          <Text style={[s.timestamp, isMe ? s.timestampRight : s.timestampLeft]}>
            {formatTime(item.created_at)}
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={s.header}>
        <Pressable
          onPress={() => router.back()}
          style={s.backBtn}
          hitSlop={10}
          accessibilityLabel="Zurueck"
          accessibilityRole="button"
        >
          <ChevronLeft color={colors.white} size={24} strokeWidth={2} />
        </Pressable>

        <Pressable
          style={s.headerProfile}
          onPress={() => userId && router.push({ pathname: "/user/[id]", params: { id: userId } })}
          accessibilityLabel={`Profil von ${otherName} oeffnen`}
          accessibilityRole="button"
        >
          {otherUser?.avatar_url ? (
            <Image source={{ uri: otherUser.avatar_url }} style={s.headerAvatar} />
          ) : (
            <View style={[s.headerAvatar, s.headerAvatarFallback]}>
              <Text style={s.headerAvatarInitial}>{otherInitial}</Text>
            </View>
          )}
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Text style={s.headerName} numberOfLines={1}>{otherName}</Text>
              {otherUser?.is_creator && <CreatorBadge size="sm" />}
            </View>
            {otherUser?.is_creator && (
              <Text style={[s.headerRole, { color: colors.coral }]}>Creator</Text>
            )}
            {otherUser?.role === "brand" && !otherUser?.is_creator && (
              <Text style={[s.headerRole, { color: colors.indigo }]}>Brand</Text>
            )}
          </View>
        </Pressable>

        <Pressable
          onPress={showMenu}
          style={s.menuBtn}
          hitSlop={10}
          accessibilityLabel="Optionen"
          accessibilityRole="button"
        >
          <MoreVertical color={colors.gray} size={22} />
        </Pressable>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {isLoading && messages.length === 0 ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            contentContainerStyle={[s.messagesList, messages.length === 0 && { flex: 1, justifyContent: "center" }]}
            ListEmptyComponent={
              <View style={s.emptyChat}>
                <Text style={s.emptyChatText}>Schreibe die erste Nachricht!</Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Input Bar */}
        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            placeholder="Nachricht..."
            placeholderTextColor={colors.grayDark}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={5000}
            accessibilityLabel="Nachricht eingeben"
          />
          <Pressable
            onPress={handleSend}
            disabled={!text.trim() || sending}
            style={[s.sendBtn, (!text.trim() || sending) && s.sendBtnDisabled]}
            accessibilityLabel="Nachricht senden"
            accessibilityRole="button"
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Send color="#fff" size={18} strokeWidth={2.5} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // Header
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  backBtn: { minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "center" },
  headerProfile: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerAvatarFallback: { backgroundColor: colors.accent, justifyContent: "center", alignItems: "center" },
  headerAvatarInitial: { color: "#fff", fontSize: 16, fontWeight: "700" },
  headerName: { color: colors.white, fontSize: 16, fontWeight: "700", maxWidth: 200 },
  headerRole: { fontSize: 11, fontWeight: "600" },
  menuBtn: { minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "center" },

  // Messages list
  messagesList: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8 },
  dateHeader: { color: colors.gray, fontSize: 12, fontWeight: "600", textAlign: "center", marginVertical: 12 },
  bubbleRow: { marginBottom: 2 },
  bubbleRowRight: { alignItems: "flex-end" },
  bubbleRowLeft: { alignItems: "flex-start" },
  bubble: { maxWidth: "75%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMe: { backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: "#F8F7F4", borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextMe: { color: colors.bg },
  bubbleTextOther: { color: colors.bg },
  timestamp: { fontSize: 11, color: colors.grayDark, marginTop: 2, marginBottom: 8 },
  timestampRight: { textAlign: "right", marginRight: 4 },
  timestampLeft: { textAlign: "left", marginLeft: 4 },

  // Empty
  emptyChat: { alignItems: "center" },
  emptyChatText: { color: colors.gray, fontSize: 15 },

  // Input bar
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 0.5, borderTopColor: colors.border, backgroundColor: colors.bgElevated },
  input: { flex: 1, backgroundColor: colors.bgInput, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: colors.white, fontSize: 15, maxHeight: 120, minHeight: 40 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, justifyContent: "center", alignItems: "center" },
  sendBtnDisabled: { opacity: 0.4 },
});
