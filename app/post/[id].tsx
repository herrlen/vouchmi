import { useEffect, useState } from "react";
import { View, Text, FlatList, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { ChevronLeft, ChevronDown, ChevronUp } from "lucide-react-native";
import { colors } from "../../src/constants/theme";
import { feed as feedApi, type Comment, type Post } from "../../src/lib/api";
import PostActions from "../../src/components/PostActions";
import LinkCard from "../../src/components/LinkCard";

const COLLAPSED_LENGTH = 140;

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
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingPost, setLoadingPost] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    feedApi.all().then(({ data }) => {
      const found = data.find((p) => p.id === id);
      setPost(found ?? null);
      setLoadingPost(false);
    }).catch(() => setLoadingPost(false));
    feedApi.comments(id).then(({ comments }) => setComments(comments)).catch(() => {});
  }, [id]);

  const send = async () => {
    if (!input.trim() || !id || sending) return;
    setSending(true);
    try {
      const { comment } = await feedApi.comment(id, input.trim());
      setComments((c) => [...c, comment]);
      setInput("");
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    }
    setSending(false);
  };

  const initial = post ? (post.author.display_name ?? post.author.username)[0]?.toUpperCase() ?? "?" : "?";
  const content = post?.content ?? "";
  const isLong = content.length > COLLAPSED_LENGTH;
  const displayContent = !isLong || expanded ? content : content.slice(0, COLLAPSED_LENGTH).trimEnd() + "…";

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
          <ChevronLeft color={colors.white} size={24} strokeWidth={2} />
        </Pressable>
        <Text style={s.headerTitle}>Beitrag</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
        <FlatList
          data={commentsOpen ? comments : []}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListHeaderComponent={
            post ? (
              <View>
                {/* Author */}
                <Pressable style={s.authorRow} onPress={() => router.push(`/user/${post.author.id}`)}>
                  {post.author.avatar_url ? (
                    <Image source={{ uri: post.author.avatar_url }} style={s.authorAvatar} />
                  ) : (
                    <View style={[s.authorAvatar, s.authorAvatarFallback]}>
                      <Text style={s.authorInitial}>{initial}</Text>
                    </View>
                  )}
                  <View>
                    <Text style={s.authorName}>{post.author.display_name ?? post.author.username}</Text>
                    <Text style={s.authorTime}>@{post.author.username} · {timeAgo(post.created_at)}</Text>
                  </View>
                </Pressable>

                {/* Link Card */}
                <LinkCard post={post} />

                {/* Actions */}
                <PostActions post={post} />

                {/* Beschreibung mit Mehr-Toggle */}
                {!!content && (
                  <View style={s.descBlock}>
                    <Text style={s.descText}>{displayContent}</Text>
                    {isLong && (
                      <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={6}>
                        <Text style={s.moreText}>{expanded ? "weniger" : "mehr"}</Text>
                      </Pressable>
                    )}
                  </View>
                )}

                {/* Kommentare Toggle (ohne Ueberschrift) */}
                <Pressable style={s.commentsToggle} onPress={() => setCommentsOpen((v) => !v)} hitSlop={6}>
                  <Text style={s.commentsToggleText}>
                    {comments.length === 0 ? "Schreibe den ersten Kommentar" : `${comments.length} ${comments.length === 1 ? "Kommentar" : "Kommentare"}`}
                  </Text>
                  {comments.length > 0 && (
                    commentsOpen
                      ? <ChevronUp color={colors.gray} size={18} strokeWidth={1.8} />
                      : <ChevronDown color={colors.gray} size={18} strokeWidth={1.8} />
                  )}
                </Pressable>
              </View>
            ) : loadingPost ? (
              <Text style={s.loadingText}>Lädt...</Text>
            ) : (
              <Text style={s.loadingText}>Beitrag nicht gefunden.</Text>
            )
          }
          renderItem={({ item }) => (
            <View style={s.commentCard}>
              {item.author.avatar_url ? (
                <Image source={{ uri: item.author.avatar_url }} style={s.commentAvatar} />
              ) : (
                <View style={[s.commentAvatar, s.commentAvatarFallback]}>
                  <Text style={s.commentAvatarText}>{(item.author.display_name ?? item.author.username)[0].toUpperCase()}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={s.commentHeader}>
                  <Text style={s.commentName}>{item.author.display_name ?? item.author.username}</Text>
                  <Text style={s.commentTime}>{timeAgo(item.created_at)}</Text>
                </View>
                <Text style={s.commentText}>{item.content}</Text>
              </View>
            </View>
          )}
        />

        <View style={s.inputBar}>
          <TextInput style={s.input} placeholder="Kommentar schreiben..." placeholderTextColor={colors.grayDark}
            value={input} onChangeText={setInput} multiline maxLength={2000} onFocus={() => setCommentsOpen(true)} />
          <Pressable style={[s.sendBtn, (!input.trim() || sending) && { opacity: 0.4 }]} onPress={send} disabled={!input.trim() || sending}>
            <Text style={s.sendText}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, gap: 10 },
  backBtn: { minWidth: 44, minHeight: 44, justifyContent: "center" },
  headerTitle: { flex: 1, color: colors.white, fontSize: 17, fontWeight: "600" },

  authorRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  authorAvatar: { width: 40, height: 40, borderRadius: 20 },
  authorAvatarFallback: { backgroundColor: colors.accent, justifyContent: "center", alignItems: "center" },
  authorInitial: { color: "#fff", fontWeight: "800", fontSize: 16 },
  authorName: { color: colors.white, fontSize: 15, fontWeight: "600" },
  authorTime: { color: colors.gray, fontSize: 12, marginTop: 1 },
  loadingText: { color: colors.gray, textAlign: "center", marginTop: 40, fontSize: 14 },

  descBlock: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 8 },
  descText: { color: colors.white, fontSize: 14, lineHeight: 20 },
  moreText: { color: colors.gray, fontSize: 13, marginTop: 4, fontWeight: "500" },

  commentsToggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 14, borderTopWidth: 0.5, borderTopColor: colors.border, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  commentsToggleText: { color: colors.white, fontSize: 13, fontWeight: "600" },

  commentCard: { flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingVertical: 8 },
  commentAvatar: { width: 30, height: 30, borderRadius: 15 },
  commentAvatarFallback: { backgroundColor: colors.accent, justifyContent: "center", alignItems: "center" },
  commentAvatarText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  commentHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  commentName: { color: colors.white, fontWeight: "600", fontSize: 13 },
  commentTime: { color: colors.grayDark, fontSize: 11 },
  commentText: { color: colors.white, fontSize: 14, lineHeight: 19 },

  inputBar: { flexDirection: "row", alignItems: "flex-end", padding: 10, gap: 8, borderTopWidth: 0.5, borderTopColor: colors.border },
  input: { flex: 1, backgroundColor: colors.bgCard, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: colors.white, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accent, justifyContent: "center", alignItems: "center" },
  sendText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
