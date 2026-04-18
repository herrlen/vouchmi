import { useEffect, useState, useMemo, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAuth } from "../../src/lib/store";
import { links as linksApi, feed as feedApi, communities as communitiesApi, type Community, type LinkPreview } from "../../src/lib/api";
import { useSharePending } from "../../src/lib/share-pending-store";
import LinkPreviewCard from "../../src/components/LinkPreviewCard";
import CommunityPicker from "../../src/components/CommunityPicker";

const MAX_COMMENT = 280;

export default function ShareCreateScreen() {
  const params = useLocalSearchParams<{ url?: string; text?: string }>();
  const pendingUrl = useSharePending((s) => s.pendingUrl);
  const clearPending = useSharePending((s) => s.clear);
  const user = useAuth((s) => s.user);

  const sharedUrl = params.url ?? pendingUrl ?? "";
  const prefillText = params.text ?? "";

  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState(prefillText);
  const [posting, setPosting] = useState(false);

  // Auth gate
  useEffect(() => {
    if (!user && sharedUrl) {
      useSharePending.getState().setPendingUrl(sharedUrl);
      router.replace("/auth");
    }
  }, [user, sharedUrl]);

  // Fetch preview
  useEffect(() => {
    if (!sharedUrl) { setLoadingPreview(false); return; }
    linksApi.preview(sharedUrl)
      .then((r) => setPreview(r.preview))
      .catch(() => {})
      .finally(() => setLoadingPreview(false));
  }, [sharedUrl]);

  // Fetch communities
  useEffect(() => {
    communitiesApi.mine()
      .then((r) => {
        setCommunities(r.communities);
        if (r.communities.length === 1) setSelectedId(r.communities[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingCommunities(false));
  }, []);

  const canSubmit = useMemo(
    () => !!sharedUrl && !!selectedId && !posting && comment.length <= MAX_COMMENT,
    [sharedUrl, selectedId, posting, comment.length]
  );

  const handleCancel = useCallback(() => {
    clearPending();
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [clearPending]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !selectedId) return;
    setPosting(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await feedApi.create(selectedId, {
        link_url: sharedUrl,
        content: comment.trim() || undefined,
        link_title: preview?.title ?? undefined,
        link_image: preview?.image ?? undefined,
        link_price: preview?.price ?? undefined,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      clearPending();
      Alert.alert("Geteilt!", "Deine Empfehlung wurde gepostet.");
      router.replace(`/community/${selectedId}`);
    } catch (e: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Fehler", e.message ?? "Posten fehlgeschlagen.");
      setPosting(false);
    }
  }, [canSubmit, selectedId, sharedUrl, comment, preview, clearPending]);

  if (!user) return null;

  const charsLeft = MAX_COMMENT - comment.length;
  const charsColor = charsLeft < 20 ? "#F472B6" : charsLeft < 50 ? "#FBBF24" : "#64748B";

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>

        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={handleCancel} style={s.headerBtn} hitSlop={12} accessibilityLabel="Abbrechen">
            <X color="#FFFFFF" size={22} strokeWidth={2} />
          </Pressable>
          <Text style={s.headerTitle}>Empfehlung teilen</Text>
          <View style={s.headerBtn} />
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Link Preview */}
          <LinkPreviewCard isLoading={loadingPreview} preview={preview} url={sharedUrl} />

          {/* Community Picker */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionLabel}>IN WELCHE COMMUNITY?</Text>
              {communities.length > 0 && <Text style={s.sectionHint}>{communities.length} verfügbar</Text>}
            </View>
            <CommunityPicker
              communities={communities}
              isLoading={loadingCommunities}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </View>

          {/* Comment */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionLabel}>WARUM EMPFIEHLST DU DAS?</Text>
              <Text style={[s.sectionHint, { color: charsColor }]}>{charsLeft}</Text>
            </View>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Optional — aber macht's persönlicher"
              placeholderTextColor="#64748B"
              multiline
              maxLength={MAX_COMMENT}
              style={s.commentInput}
              accessibilityLabel="Empfehlungstext"
              selectionColor="#F59E0B"
            />
          </View>

        </ScrollView>

        {/* Submit */}
        <View style={s.footer}>
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Empfehlung posten"
          >
            {posting ? (
              <ActivityIndicator color="#1A1D2E" />
            ) : (
              <Text style={s.submitText}>Vouchen</Text>
            )}
          </Pressable>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0E1A" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: "#1E2235",
  },
  headerBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
  scroll: { padding: 16, paddingBottom: 32, gap: 24 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionLabel: { color: "#FFFFFF", fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  sectionHint: { color: "#64748B", fontSize: 12 },
  commentInput: {
    color: "#FFFFFF", fontSize: 15, backgroundColor: "#141926",
    borderRadius: 14, borderWidth: 1, borderColor: "#1E2235",
    padding: 14, minHeight: 100, textAlignVertical: "top",
  },
  footer: {
    padding: 16, paddingBottom: Platform.OS === "ios" ? 16 : 24,
    borderTopWidth: 1, borderTopColor: "#1E2235", backgroundColor: "#0A0E1A",
  },
  submitBtn: {
    backgroundColor: "#F59E0B", height: 54, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  submitBtnDisabled: { backgroundColor: "#1E2235" },
  submitText: { color: "#1A1D2E", fontSize: 16, fontWeight: "800" },
});
