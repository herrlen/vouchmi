import { useState, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Share, Alert, Modal, TouchableWithoutFeedback, Animated, TextInput, Image, FlatList, Platform } from "react-native";
import { Heart, MessageCircle, Repeat2, Send, X, Copy, ExternalLink } from "lucide-react-native";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { colors } from "../constants/theme";
import { feed as feedApi, type Post } from "../lib/api";
import { useAuth } from "../lib/store";

type Props = {
  post: Post;
  onLikeChange?: (postId: string, likeCount: number) => void;
  onRepostChange?: (postId: string, repostCount: number) => void;
};

export default function PostActions({ post, onLikeChange, onRepostChange }: Props) {
  const me = useAuth((s) => s.user);
  const isOwn = me?.id === post.author.id;

  const [liked, setLiked] = useState(post.is_liked ?? false);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [reposted, setReposted] = useState(post.is_reposted ?? false);
  const [repostCount, setRepostCount] = useState(post.repost_count ?? 0);

  const [repostSheet, setRepostSheet] = useState(false);
  const [sendSheet, setSendSheet] = useState(false);
  const [repostEditor, setRepostEditor] = useState(false);
  const [repostComment, setRepostComment] = useState("");

  const repostFade = useRef(new Animated.Value(0)).current;
  const sendFade = useRef(new Animated.Value(0)).current;

  const toggleLike = async () => {
    try {
      const { like_count, liked: nowLiked } = await feedApi.like(post.id);
      setLiked(nowLiked);
      setLikeCount(like_count);
      onLikeChange?.(post.id, like_count);
    } catch {}
  };

  // --- Repost Sheet ---
  const openRepostSheet = () => {
    if (isOwn) return;
    if (reposted) {
      Alert.alert("Repost entfernen?", "Der Beitrag wird aus deinem Feed entfernt.", [
        { text: "Abbrechen", style: "cancel" },
        { text: "Entfernen", style: "destructive", onPress: async () => {
          try {
            const { repost_count } = await feedApi.unrepost(post.id);
            setReposted(false);
            setRepostCount(repost_count);
            onRepostChange?.(post.id, repost_count);
          } catch (e: any) { Alert.alert("Fehler", e.message); }
        }},
      ]);
      return;
    }
    setRepostSheet(true);
    Animated.timing(repostFade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  };

  const closeRepostSheet = () => {
    Animated.timing(repostFade, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setRepostSheet(false));
  };

  const instantRepost = () => {
    setRepostSheet(false);
    setTimeout(async () => {
      try {
        const { repost_count } = await feedApi.repost(post.id);
        setReposted(true);
        setRepostCount(repost_count);
        onRepostChange?.(post.id, repost_count);
        Alert.alert("Geteilt", "In deinem Feed geteilt.");
      } catch (e: any) { Alert.alert("Fehler", e.message); }
    }, 300);
  };

  const openRepostEditor = () => {
    setRepostSheet(false);
    setTimeout(() => setRepostEditor(true), 300);
  };

  const submitRepostWithComment = async () => {
    try {
      const { repost_count } = await feedApi.repost(post.id, repostComment.trim() || undefined);
      setReposted(true);
      setRepostCount(repost_count);
      onRepostChange?.(post.id, repost_count);
      setRepostEditor(false);
      setRepostComment("");
      Alert.alert("Geteilt", "In deinem Feed geteilt.");
    } catch (e: any) { Alert.alert("Fehler", e.message); }
  };

  // --- Send Sheet ---
  const openSendSheet = () => {
    setSendSheet(true);
    Animated.timing(sendFade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  };

  const closeSendSheet = () => {
    Animated.timing(sendFade, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setSendSheet(false));
  };

  const copyLink = () => {
    setSendSheet(false);
    const url = post.link_affiliate_url ?? post.link_url ?? "";
    setTimeout(async () => {
      await Clipboard.setStringAsync(url);
      Alert.alert("Kopiert", "Link in der Zwischenablage.");
    }, 300);
  };

  const shareExternal = () => {
    setSendSheet(false);
    const url = post.link_affiliate_url ?? post.link_url;
    const text = post.link_title ? `${post.link_title}\n${url}` : url ?? post.content;
    setTimeout(async () => {
      try { await Share.share({ message: text ?? "" }); } catch {}
    }, 300);
  };

  const initial = (post.author.display_name ?? post.author.username)[0]?.toUpperCase() ?? "?";

  return (
    <View>
      <View style={s.row}>
        <Pressable style={s.btn} onPress={toggleLike} hitSlop={6}>
          <Heart color={liked ? "#FF3B30" : colors.white} fill={liked ? "#FF3B30" : "none"} size={20} strokeWidth={1.8} />
          {likeCount > 0 && <Text style={[s.count, liked && { color: "#FF3B30" }]}>{likeCount}</Text>}
        </Pressable>

        <Pressable style={s.btn} onPress={() => router.push(`/post/${post.id}`)} hitSlop={6}>
          <MessageCircle color={colors.white} size={20} strokeWidth={1.8} />
          {post.comment_count > 0 && <Text style={s.count}>{post.comment_count}</Text>}
        </Pressable>

        <Pressable style={s.btn} onPress={openRepostSheet} hitSlop={6} disabled={isOwn}>
          <Repeat2 color={isOwn ? colors.grayDark : reposted ? colors.accent : colors.white} size={20} strokeWidth={1.8} />
          {repostCount > 0 && <Text style={[s.count, reposted && { color: colors.accent }]}>{repostCount}</Text>}
        </Pressable>

        <Pressable style={s.btn} onPress={openSendSheet} hitSlop={6}>
          <Send color={colors.white} size={20} strokeWidth={1.8} />
        </Pressable>
      </View>

      {/* Repost Bottom-Sheet */}
      <Modal visible={repostSheet} transparent animationType="none" statusBarTranslucent>
        <TouchableWithoutFeedback onPress={closeRepostSheet}>
          <Animated.View style={[s.backdrop, { opacity: repostFade }]}>
            <TouchableWithoutFeedback>
              <Animated.View style={[s.sheet, { transform: [{ translateY: repostFade.interpolate({ inputRange: [0, 1], outputRange: [200, 0] }) }] }]}>
                <View style={s.handle} />
                <Pressable style={s.sheetOption} onPress={instantRepost}>
                  <Repeat2 color={colors.accent} size={22} strokeWidth={1.8} />
                  <Text style={s.sheetOptionText}>Sofort teilen</Text>
                </Pressable>
                <Pressable style={s.sheetOption} onPress={openRepostEditor}>
                  <MessageCircle color={colors.accent} size={22} strokeWidth={1.8} />
                  <Text style={s.sheetOptionText}>Mit Kommentar teilen</Text>
                </Pressable>
                <Pressable style={s.sheetCancel} onPress={closeRepostSheet}>
                  <Text style={s.sheetCancelText}>Abbrechen</Text>
                </Pressable>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Repost Editor Modal */}
      <Modal visible={repostEditor} animationType="slide" presentationStyle="formSheet">
        <View style={s.editorContainer}>
          <View style={s.editorHeader}>
            <Pressable onPress={() => { setRepostEditor(false); setRepostComment(""); }} hitSlop={10}>
              <X color={colors.white} size={24} />
            </Pressable>
            <Text style={s.editorTitle}>Teilen</Text>
            <Pressable onPress={submitRepostWithComment} hitSlop={10}>
              <Text style={s.editorPost}>Teilen</Text>
            </Pressable>
          </View>
          <TextInput
            style={s.editorInput}
            placeholder="Dein Kommentar..."
            placeholderTextColor={colors.gray}
            value={repostComment}
            onChangeText={setRepostComment}
            multiline
            maxLength={280}
            autoFocus
          />
          <Text style={s.editorCounter}>{repostComment.length}/280</Text>

          <View style={s.embedCard}>
            <View style={s.embedHeader}>
              {post.author.avatar_url ? (
                <Image source={{ uri: post.author.avatar_url }} style={s.embedAvatar} />
              ) : (
                <View style={[s.embedAvatar, s.embedAvatarFallback]}>
                  <Text style={s.embedAvatarInitial}>{initial}</Text>
                </View>
              )}
              <Text style={s.embedName} numberOfLines={1}>{post.author.display_name ?? post.author.username}</Text>
            </View>
            {post.link_image && <Image source={{ uri: post.link_image }} style={s.embedImage} />}
            {post.link_title && <Text style={s.embedTitle} numberOfLines={2}>{post.link_title}</Text>}
            {post.link_price != null && <Text style={s.embedPrice}>{post.link_price.toFixed(2)} €</Text>}
          </View>
        </View>
      </Modal>

      {/* Send Bottom-Sheet */}
      <Modal visible={sendSheet} transparent animationType="none" statusBarTranslucent>
        <TouchableWithoutFeedback onPress={closeSendSheet}>
          <Animated.View style={[s.backdrop, { opacity: sendFade }]}>
            <TouchableWithoutFeedback>
              <Animated.View style={[s.sheet, { transform: [{ translateY: sendFade.interpolate({ inputRange: [0, 1], outputRange: [200, 0] }) }] }]}>
                <View style={s.handle} />
                <Text style={s.sheetTitle}>Senden</Text>
                <Pressable style={s.sheetOption} onPress={copyLink}>
                  <Copy color={colors.accent} size={22} strokeWidth={1.8} />
                  <Text style={s.sheetOptionText}>Link kopieren</Text>
                </Pressable>
                <Pressable style={s.sheetOption} onPress={shareExternal}>
                  <ExternalLink color={colors.accent} size={22} strokeWidth={1.8} />
                  <Text style={s.sheetOptionText}>An andere App senden</Text>
                </Pressable>
                <Pressable style={s.sheetCancel} onPress={closeSendSheet}>
                  <Text style={s.sheetCancelText}>Abbrechen</Text>
                </Pressable>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 4 },
  btn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, minHeight: 44, paddingVertical: 6 },
  count: { color: colors.gray, fontSize: 13, fontWeight: "500" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.bgElevated, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Platform.OS === "ios" ? 44 : 24 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.grayDark, alignSelf: "center", marginBottom: 16 },
  sheetTitle: { color: colors.white, fontSize: 16, fontWeight: "700", marginBottom: 12 },
  sheetOption: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, minHeight: 52 },
  sheetOptionText: { color: colors.white, fontSize: 16, fontWeight: "500" },
  sheetCancel: { paddingVertical: 14, alignItems: "center", marginTop: 6, minHeight: 44 },
  sheetCancelText: { color: colors.gray, fontSize: 15, fontWeight: "500" },

  editorContainer: { flex: 1, backgroundColor: colors.bg, padding: 16, paddingTop: Platform.OS === "ios" ? 60 : 16 },
  editorHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  editorTitle: { color: colors.white, fontSize: 17, fontWeight: "600" },
  editorPost: { color: colors.accent, fontSize: 16, fontWeight: "700" },
  editorInput: { color: colors.white, fontSize: 16, minHeight: 60, marginBottom: 4 },
  editorCounter: { color: colors.gray, fontSize: 11, textAlign: "right", marginBottom: 16 },

  embedCard: { backgroundColor: "#1E2A32", borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: "#2A3942" },
  embedHeader: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, paddingBottom: 6 },
  embedAvatar: { width: 24, height: 24, borderRadius: 12 },
  embedAvatarFallback: { backgroundColor: colors.accent, justifyContent: "center", alignItems: "center" },
  embedAvatarInitial: { color: colors.bg, fontWeight: "800", fontSize: 10 },
  embedName: { color: colors.gray, fontSize: 12, fontWeight: "600" },
  embedImage: { width: "100%", aspectRatio: 16 / 9, backgroundColor: colors.bgCard },
  embedTitle: { color: colors.white, fontSize: 13, fontWeight: "600", paddingHorizontal: 12, paddingTop: 8 },
  embedPrice: { color: colors.accent, fontSize: 14, fontWeight: "700", paddingHorizontal: 12, paddingVertical: 8 },
});
