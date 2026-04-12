import { useEffect, useState } from "react";
import { View, Text, FlatList, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { colors } from "../../src/constants/theme";
import { feed, type Comment } from "../../src/lib/api";

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "gerade eben";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [comments, setComments] = useState<Comment[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      const { comments } = await feed.comments(id);
      setComments(comments);
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    }
  };

  useEffect(() => { load(); }, [id]);

  const send = async () => {
    if (!input.trim() || !id || sending) return;
    setSending(true);
    try {
      const { comment } = await feed.comment(id, input.trim());
      setComments((c) => [...c, comment]);
      setInput("");
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    }
    setSending(false);
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={s.back}>‹ Zurück</Text>
        </Pressable>
        <Text style={s.title}>Kommentare</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
        <FlatList
          data={comments}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={<Text style={s.empty}>Noch keine Kommentare. Sei der erste.</Text>}
          renderItem={({ item }) => (
            <View style={s.commentCard}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>
                  {(item.author.display_name ?? item.author.username)[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.commentHeader}>
                  <Text style={s.name}>{item.author.display_name ?? item.author.username}</Text>
                  <Text style={s.time}>{timeAgo(item.created_at)}</Text>
                </View>
                <Text style={s.commentText}>{item.content}</Text>
              </View>
            </View>
          )}
        />

        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            placeholder="Kommentar schreiben..."
            placeholderTextColor={colors.grayDark}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={2000}
          />
          <Pressable
            style={[s.sendBtn, (!input.trim() || sending) && { opacity: 0.4 }]}
            onPress={send}
            disabled={!input.trim() || sending}
          >
            <Text style={s.sendText}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  back: { color: colors.accent, fontSize: 16, width: 60 },
  title: { color: colors.white, fontSize: 18, fontWeight: "600" },
  empty: { color: colors.gray, textAlign: "center", marginTop: 40 },
  commentCard: { flexDirection: "row", gap: 10, backgroundColor: colors.bgCard, padding: 12, borderRadius: 12, marginBottom: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent, justifyContent: "center", alignItems: "center" },
  avatarText: { color: colors.bg, fontWeight: "700" },
  commentHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  name: { color: colors.white, fontWeight: "600", fontSize: 14 },
  time: { color: colors.grayDark, fontSize: 11 },
  commentText: { color: colors.white, fontSize: 14, lineHeight: 19 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
  input: { flex: 1, backgroundColor: colors.bgCard, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: colors.white, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, justifyContent: "center", alignItems: "center" },
  sendText: { color: colors.bg, fontSize: 20, fontWeight: "700" },
});
