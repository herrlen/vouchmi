import { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, Pressable, StyleSheet, Modal, Animated, TouchableWithoutFeedback,
  TextInput, FlatList, Image, KeyboardAvoidingView, Platform, ActivityIndicator,
  Dimensions, PanResponder, Alert,
} from "react-native";
import { ChevronDown, ChevronUp, Heart, Smile, Send, BadgeCheck } from "lucide-react-native";
import { colors } from "../constants/theme";
import CreatorBadge from "./CreatorBadge";
import { feed as feedApi, isCreator, type Comment } from "../lib/api";
import { useAuth } from "../lib/store";

const { height: SCREEN_H } = Dimensions.get("window");
const PEEK_H = SCREEN_H * 0.6;
const FULL_H = SCREEN_H * 0.9;

const QUICK_EMOJIS = ["❤️", "🙌", "🔥", "👏", "😢", "😍", "😮", "😂"];

type SortMode = "foryou" | "newest" | "popular";

type Props = {
  postId: string | null;
  visible: boolean;
  onClose: () => void;
  onCommentAdded?: () => void;
};

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "gerade";
  if (m < 60) return `${m} Min.`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} Std.`;
  return `${Math.floor(h / 24)} T.`;
}

export default function CommentsSheet({ postId, visible, onClose, onCommentAdded }: Props) {
  const me = useAuth((s) => s.user);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [sort, setSort] = useState<SortMode>("foryou");
  const [sortOpen, setSortOpen] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const sheetHeight = useRef(new Animated.Value(PEEK_H)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  const load = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const { comments } = await feedApi.comments(postId, sort);
      setComments(comments);
    } catch {}
    setLoading(false);
  }, [postId, sort]);

  useEffect(() => {
    if (visible && postId) {
      load();
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: false, tension: 65, friction: 11 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: false }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: SCREEN_H, duration: 200, useNativeDriver: false }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: false }),
      ]).start();
    }
  }, [visible, postId]);

  useEffect(() => { if (visible) load(); }, [sort]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100) {
          onClose();
        } else if (g.dy < -50) {
          Animated.spring(sheetHeight, { toValue: FULL_H, useNativeDriver: false }).start();
          Animated.spring(translateY, { toValue: 0, useNativeDriver: false }).start();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  const toggleLike = async (c: Comment) => {
    try {
      const { liked, like_count } = await feedApi.likeComment(c.id);
      setComments((arr) => arr.map((p) => mapUpdate(p, c.id, { is_liked: liked, like_count })));
    } catch {}
  };

  const mapUpdate = (c: Comment, id: string, patch: Partial<Comment>): Comment => {
    if (c.id === id) return { ...c, ...patch };
    if (c.replies) return { ...c, replies: c.replies.map((r) => mapUpdate(r, id, patch)) };
    return c;
  };

  const startReply = (c: Comment) => {
    setReplyTo(c);
    setInput(`@${c.author.username} `);
    inputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyTo(null);
    setInput("");
  };

  const sendComment = async (text?: string) => {
    if (!postId) return;
    const content = (text ?? input).trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const { comment } = await feedApi.comment(postId, content, replyTo?.id);
      if (replyTo) {
        setComments((arr) => arr.map((p) => {
          if (p.id === replyTo.id) {
            return { ...p, replies: [...(p.replies ?? []), comment] };
          }
          return p;
        }));
        setExpandedReplies((s) => new Set(s).add(replyTo.id));
      } else {
        setComments((arr) => [comment, ...arr]);
      }
      setInput("");
      setReplyTo(null);
      onCommentAdded?.();
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    }
    setSending(false);
  };

  const toggleReplies = (id: string) => {
    setExpandedReplies((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const sortLabel = sort === "foryou" ? "Für dich" : sort === "newest" ? "Neueste" : "Beliebteste";

  const renderComment = (c: Comment, isReply = false) => {
    const initial = (c.author.display_name ?? c.author.username)[0]?.toUpperCase() ?? "?";
    const hasReplies = (c.replies?.length ?? 0) > 0;
    const expanded = expandedReplies.has(c.id);

    return (
      <View key={c.id}>
        <View style={[s.commentRow, isReply && s.replyRow]}>
          {c.author.avatar_url ? (
            <Image source={{ uri: c.author.avatar_url }} style={isReply ? s.replyAvatar : s.avatar} />
          ) : (
            <View style={[isReply ? s.replyAvatar : s.avatar, s.avatarFallback]}>
              <Text style={isReply ? s.replyInitial : s.avatarInitial}>{initial}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={s.headerRow}>
              <Text style={s.username}>{c.author.display_name ?? c.author.username}</Text>
              {isCreator(c.author) && <CreatorBadge size="sm" />}
              <Text style={s.time}>{timeAgo(c.created_at)}</Text>
            </View>
            <Text style={s.content}>{c.content}</Text>
            <Pressable onPress={() => startReply(c)} hitSlop={6}>
              <Text style={s.replyLink}>Antworten</Text>
            </Pressable>
            {hasReplies && !isReply && (
              <Pressable onPress={() => toggleReplies(c.id)} hitSlop={6} style={s.showReplies}>
                <Text style={s.showRepliesText}>
                  {expanded ? "Antworten ausblenden" : `Antworten anzeigen (${c.replies!.length})`}
                </Text>
              </Pressable>
            )}
          </View>
          <Pressable style={s.likeBtn} onPress={() => toggleLike(c)} hitSlop={8}>
            <Heart
              color={c.is_liked ? "#FF3B30" : colors.gray}
              fill={c.is_liked ? "#FF3B30" : "none"}
              size={16}
              strokeWidth={1.8}
            />
            {(c.like_count ?? 0) > 0 && (
              <Text style={[s.likeCount, c.is_liked && { color: "#FF3B30" }]}>{c.like_count}</Text>
            )}
          </Pressable>
        </View>
        {hasReplies && expanded && c.replies!.map((r) => renderComment(r, true))}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[s.backdrop, { opacity: backdropOpacity }]}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.kav}>
          <Animated.View style={[s.sheet, { height: sheetHeight, transform: [{ translateY }] }]}>
            {/* Drag-Handle */}
            <View {...panResponder.panHandlers} style={s.handleArea}>
              <View style={s.handle} />
            </View>

            {/* Header */}
            <View style={s.sheetHeader}>
              <Text style={s.title}>Kommentare</Text>
            </View>

            {/* Sort Dropdown */}
            <View style={s.sortRow}>
              <Pressable style={s.sortBtn} onPress={() => setSortOpen((v) => !v)} hitSlop={4}>
                <Text style={s.sortText}>{sortLabel}</Text>
                {sortOpen ? <ChevronUp color={colors.gray} size={14} /> : <ChevronDown color={colors.gray} size={14} />}
              </Pressable>
              {sortOpen && (
                <View style={s.sortMenu}>
                  {(["foryou", "newest", "popular"] as SortMode[]).map((m) => (
                    <Pressable key={m} style={s.sortItem} onPress={() => { setSort(m); setSortOpen(false); }}>
                      <Text style={[s.sortItemText, sort === m && { color: colors.accent }]}>
                        {m === "foryou" ? "Für dich" : m === "newest" ? "Neueste" : "Beliebteste"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Comment List */}
            {loading ? (
              <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(c) => c.id}
                contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 12 }}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View style={s.emptyWrap}>
                    <Text style={s.emptyText}>Noch keine Kommentare.{"\n"}Sei der Erste!</Text>
                  </View>
                }
                renderItem={({ item }) => renderComment(item)}
              />
            )}

            {/* Reply Indicator */}
            {replyTo && (
              <View style={s.replyBanner}>
                <Text style={s.replyBannerText}>
                  Antwort an <Text style={{ fontWeight: "700" }}>@{replyTo.author.username}</Text>
                </Text>
                <Pressable onPress={cancelReply} hitSlop={6}>
                  <Text style={s.replyBannerCancel}>✕</Text>
                </Pressable>
              </View>
            )}

            {/* Quick Emojis */}
            <View style={s.emojiBar}>
              {QUICK_EMOJIS.map((e) => (
                <Pressable key={e} style={s.emojiChip} onPress={() => sendComment(e)} hitSlop={4}>
                  <Text style={s.emoji}>{e}</Text>
                </Pressable>
              ))}
            </View>

            {/* Input */}
            <View style={s.inputBar}>
              {me?.username ? (
                <View style={[s.inputAvatar, s.avatarFallback]}>
                  <Text style={s.inputAvatarInitial}>{me.username[0]?.toUpperCase()}</Text>
                </View>
              ) : null}
              <TextInput
                ref={inputRef}
                style={s.input}
                placeholder="Was hältst du hiervon?"
                placeholderTextColor={colors.grayDark}
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={2000}
              />
              {input.trim().length > 0 ? (
                <Pressable style={s.sendBtn} onPress={() => sendComment()} disabled={sending} hitSlop={6}>
                  <Send color={colors.accent} size={20} strokeWidth={2} />
                </Pressable>
              ) : (
                <Pressable style={s.sendBtn} hitSlop={6} onPress={() => inputRef.current?.focus()}>
                  <Smile color={colors.gray} size={20} strokeWidth={1.8} />
                </Pressable>
              )}
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  kav: { justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#1A1A1A",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: "hidden",
  },
  handleArea: { paddingTop: 10, paddingBottom: 6, alignItems: "center" },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.grayDark },

  sheetHeader: { paddingVertical: 10, alignItems: "center", borderBottomWidth: 0.5, borderBottomColor: colors.border },
  title: { color: colors.white, fontSize: 16, fontWeight: "700" },

  sortRow: { paddingHorizontal: 14, paddingVertical: 10, zIndex: 10 },
  sortBtn: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" },
  sortText: { color: colors.gray, fontSize: 13, fontWeight: "500" },
  sortMenu: { position: "absolute", top: 36, left: 14, backgroundColor: colors.bgElevated, borderRadius: 10, padding: 4, minWidth: 140, zIndex: 20, elevation: 8, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  sortItem: { paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, justifyContent: "center" },
  sortItemText: { color: colors.white, fontSize: 14 },

  commentRow: { flexDirection: "row", gap: 10, paddingVertical: 10 },
  replyRow: { paddingLeft: 44 },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  replyAvatar: { width: 26, height: 26, borderRadius: 13 },
  avatarFallback: { backgroundColor: colors.accent, justifyContent: "center", alignItems: "center" },
  avatarInitial: { color: "#fff", fontWeight: "800", fontSize: 14 },
  replyInitial: { color: "#fff", fontWeight: "800", fontSize: 11 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  username: { color: colors.white, fontSize: 13, fontWeight: "700" },
  time: { color: colors.gray, fontSize: 11 },
  content: { color: colors.white, fontSize: 14, lineHeight: 19, marginTop: 2 },
  replyLink: { color: colors.gray, fontSize: 12, marginTop: 4, fontWeight: "600" },
  showReplies: { marginTop: 6 },
  showRepliesText: { color: colors.accent, fontSize: 12, fontWeight: "600" },
  likeBtn: { alignItems: "center", paddingTop: 4, minWidth: 28, minHeight: 44 },
  likeCount: { color: colors.gray, fontSize: 11, marginTop: 2 },

  emptyWrap: { paddingVertical: 40, alignItems: "center" },
  emptyText: { color: colors.gray, fontSize: 13, textAlign: "center", lineHeight: 19 },

  replyBanner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.bgCard },
  replyBannerText: { color: colors.gray, fontSize: 12 },
  replyBannerCancel: { color: colors.gray, fontSize: 14, padding: 4 },

  emojiBar: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 6, gap: 6, borderTopWidth: 0.5, borderTopColor: colors.border },
  emojiChip: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  emoji: { fontSize: 22 },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: Platform.OS === "ios" ? 34 : 12,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  inputAvatar: { width: 32, height: 32, borderRadius: 16 },
  inputAvatarInitial: { color: "#fff", fontWeight: "800", fontSize: 13 },
  input: {
    flex: 1,
    backgroundColor: "#2A2A2A",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    color: colors.white,
    fontSize: 14,
    maxHeight: 100,
    minHeight: 40,
  },
  sendBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
});
