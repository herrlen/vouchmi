import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, Image, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { X, Check, Lock, ExternalLink } from "lucide-react-native";
import { colors } from "../../src/constants/theme";
import { useAuth, useApp } from "../../src/lib/store";
import { links as linksApi, feed as feedApi, communities as communitiesApi, type Community, type LinkPreview } from "../../src/lib/api";
import { useSharePending } from "../../src/lib/share-pending-store";

export default function ShareCreateScreen() {
  const params = useLocalSearchParams<{ url?: string }>();
  const pendingUrl = useSharePending((s) => s.pendingUrl);
  const clearPending = useSharePending((s) => s.clear);
  const user = useAuth((s) => s.user);

  const sharedUrl = params.url ?? pendingUrl ?? "";

  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!user && sharedUrl) {
      useSharePending.getState().setPendingUrl(sharedUrl);
      router.replace("/auth");
    }
  }, [user, sharedUrl]);

  // Load preview
  useEffect(() => {
    if (!sharedUrl) return;
    setLoadingPreview(true);
    linksApi.preview(sharedUrl)
      .then((r) => setPreview(r.preview))
      .catch(() => {})
      .finally(() => setLoadingPreview(false));
  }, [sharedUrl]);

  // Load communities
  useEffect(() => {
    communitiesApi.mine()
      .then((r) => {
        setCommunities(r.communities);
        if (r.communities.length > 0) setSelectedCommunity(r.communities[0].id);
      })
      .catch(() => {});
  }, []);

  const submit = async () => {
    if (!selectedCommunity) return Alert.alert("Community wählen", "Bitte wähle eine Community aus.");
    if (!sharedUrl) return;

    setPosting(true);
    try {
      await feedApi.create(selectedCommunity, {
        link_url: sharedUrl,
        content: comment.trim() || undefined,
        link_title: preview?.title ?? undefined,
        link_image: preview?.image ?? undefined,
        link_price: preview?.price ?? undefined,
      });
      clearPending();
      Alert.alert("Geteilt!", "Deine Empfehlung wurde gepostet.");
      router.replace(`/community/${selectedCommunity}`);
    } catch (e: any) {
      Alert.alert("Fehler", e.message ?? "Konnte nicht posten.");
    } finally {
      setPosting(false);
    }
  };

  const cancel = () => {
    clearPending();
    router.back();
  };

  if (!user) return null;

  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={cancel} style={s.headerBtn} hitSlop={10}>
          <X color="#FFFFFF" size={22} strokeWidth={2} />
        </Pressable>
        <Text style={s.headerTitle}>Empfehlung teilen</Text>
        <View style={s.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        {/* Link Preview */}
        <View style={s.previewCard}>
          {loadingPreview ? (
            <ActivityIndicator color={colors.accent} style={{ paddingVertical: 40 }} />
          ) : preview ? (
            <>
              {preview.image && <Image source={{ uri: preview.image }} style={s.previewImage} />}
              <View style={s.previewInfo}>
                {preview.title && <Text style={s.previewTitle} numberOfLines={2}>{preview.title}</Text>}
                <View style={s.previewDomain}>
                  <Lock color="#10B981" size={11} strokeWidth={2.2} />
                  <Text style={s.previewDomainText}>{preview.domain}</Text>
                </View>
                {preview.price != null && (
                  <Text style={s.previewPrice}>{preview.price.toFixed(2)} €</Text>
                )}
              </View>
            </>
          ) : (
            <View style={s.previewFallback}>
              <ExternalLink color="#64748B" size={24} />
              <Text style={s.previewUrl} numberOfLines={2}>{sharedUrl}</Text>
            </View>
          )}
        </View>

        {/* Community Picker */}
        <Text style={s.sectionLabel}>COMMUNITY WÄHLEN</Text>
        <View style={s.communityList}>
          {communities.length === 0 ? (
            <Text style={s.emptyText}>Du bist noch in keiner Community. Tritt einer bei, um Empfehlungen zu teilen.</Text>
          ) : communities.map((c) => {
            const isSelected = selectedCommunity === c.id;
            return (
              <Pressable
                key={c.id}
                style={[s.communityItem, isSelected && s.communityItemSelected]}
                onPress={() => setSelectedCommunity(c.id)}
              >
                <View style={[s.communityDot, isSelected && s.communityDotSelected]} />
                <Text style={[s.communityName, isSelected && s.communityNameSelected]}>{c.name}</Text>
                {isSelected && <Check color={colors.accent} size={18} strokeWidth={2.5} />}
              </Pressable>
            );
          })}
        </View>

        {/* Comment */}
        <Text style={s.sectionLabel}>KOMMENTAR (OPTIONAL)</Text>
        <TextInput
          style={s.commentInput}
          placeholder="Warum empfiehlst du das?"
          placeholderTextColor="#64748B"
          value={comment}
          onChangeText={setComment}
          multiline
          maxLength={280}
        />
        <Text style={s.charCount}>{comment.length}/280</Text>

      </ScrollView>

      {/* CTA */}
      <View style={s.bottomBar}>
        <Pressable
          style={[s.ctaBtn, (!selectedCommunity || posting) && s.ctaBtnDisabled]}
          onPress={submit}
          disabled={!selectedCommunity || posting}
        >
          {posting ? (
            <ActivityIndicator color="#1A1D2E" />
          ) : (
            <Text style={s.ctaText}>Vouchen</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0E1A" },

  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  headerBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  headerTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },

  content: { padding: 20, paddingBottom: 100 },

  // Preview
  previewCard: { backgroundColor: "#141926", borderRadius: 20, overflow: "hidden", marginBottom: 24 },
  previewImage: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#2A2D3E" },
  previewInfo: { padding: 16 },
  previewTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "700", lineHeight: 22, marginBottom: 6 },
  previewDomain: { flexDirection: "row", alignItems: "center", gap: 4 },
  previewDomainText: { color: "#94A3B8", fontSize: 12 },
  previewPrice: { color: colors.accent, fontSize: 18, fontWeight: "800", marginTop: 8 },
  previewFallback: { padding: 24, alignItems: "center", gap: 10 },
  previewUrl: { color: "#64748B", fontSize: 13, textAlign: "center" },

  // Section
  sectionLabel: { color: "#94A3B8", fontSize: 11, fontWeight: "600", letterSpacing: 2, marginBottom: 10 },

  // Community picker
  communityList: { gap: 6, marginBottom: 24 },
  communityItem: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#141926", borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: "transparent" },
  communityItemSelected: { borderColor: colors.accent },
  communityDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: "#4A5068" },
  communityDotSelected: { borderColor: colors.accent, backgroundColor: colors.accent },
  communityName: { flex: 1, color: "#94A3B8", fontSize: 15, fontWeight: "600" },
  communityNameSelected: { color: "#FFFFFF" },
  emptyText: { color: "#64748B", fontSize: 14, textAlign: "center", paddingVertical: 20 },

  // Comment
  commentInput: { backgroundColor: "#141926", borderRadius: 14, padding: 16, color: "#FFFFFF", fontSize: 15, minHeight: 80, textAlignVertical: "top" },
  charCount: { color: "#4A5068", fontSize: 11, textAlign: "right", marginTop: 4 },

  // CTA
  bottomBar: { paddingHorizontal: 20, paddingBottom: 16, backgroundColor: "#0A0E1A", borderTopWidth: 0.5, borderTopColor: "#1E2235", paddingTop: 12 },
  ctaBtn: { backgroundColor: colors.accent, paddingVertical: 16, borderRadius: 14, alignItems: "center", minHeight: 56, justifyContent: "center" },
  ctaBtnDisabled: { opacity: 0.4 },
  ctaText: { color: "#1A1D2E", fontSize: 16, fontWeight: "800" },
});
