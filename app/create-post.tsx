import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, Alert, ScrollView, Image, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { X, Link as LinkIcon, RefreshCw } from "lucide-react-native";
import { colors } from "../src/constants/theme";
import { links, feed as feedApi, communities as communitiesApi, type LinkPreview, type Community } from "../src/lib/api";

export default function CreatePostScreen() {
  const { cid: preselectedCid } = useLocalSearchParams<{ cid?: string }>();
  const [url, setUrl] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCid, setSelectedCid] = useState<string | null>(preselectedCid ?? null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    communitiesApi.mine()
      .then((r) => {
        setCommunities(r.communities);
        if (preselectedCid && r.communities.some((c) => c.id === preselectedCid)) {
          setSelectedCid(preselectedCid);
        } else if (r.communities.length === 1) {
          setSelectedCid(r.communities[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const fetchPreview = async () => {
    const clean = url.trim();
    if (!clean) return;
    if (!/^https?:\/\//i.test(clean)) {
      Alert.alert("Ungültiger Link", "Der Link muss mit http:// oder https:// beginnen.");
      return;
    }
    setLoadingPreview(true);
    setPreview(null);
    try {
      const { preview } = await links.preview(clean);
      setPreview(preview);
      setTitle(preview.title ?? "");
      setDescription("");
    } catch (e: any) {
      Alert.alert("Preview fehlgeschlagen", e.message);
    }
    setLoadingPreview(false);
  };

  const clearPreview = () => {
    setPreview(null);
    setUrl("");
    setTitle("");
    setDescription("");
  };

  const submit = async () => {
    if (!preview) return Alert.alert("Kein Produkt", "Bitte lade erst die Preview.");
    if (!title.trim()) return Alert.alert("Titel fehlt", "Gib einen Titel für dein Produkt ein.");
    if (!selectedCid) return Alert.alert("Community wählen", "Wähle die Community, in der du posten willst.");

    setSubmitting(true);
    try {
      await feedApi.create(selectedCid, {
        content: description.trim(),
        link_url: preview.original_url,
        link_title: title.trim(),
        link_image: preview.image ?? undefined,
        link_price: preview.price ?? undefined,
      });
      router.back();
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    }
    setSubmitting(false);
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <X color={colors.white} size={24} />
        </Pressable>
        <Text style={s.title}>Produkt teilen</Text>
        <Pressable
          onPress={submit}
          disabled={submitting || !preview || !selectedCid}
          hitSlop={10}
        >
          <Text style={[s.postBtn, (submitting || !preview || !selectedCid) && { opacity: 0.4 }]}>
            {submitting ? "..." : "Posten"}
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={40}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text style={s.label}>Produkt-Link</Text>
          <View style={s.urlRow}>
            <LinkIcon color={colors.gray} size={18} />
            <TextInput
              style={s.urlInput}
              placeholder="https://..."
              placeholderTextColor={colors.gray}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              onSubmitEditing={fetchPreview}
              returnKeyType="go"
            />
            {!!url && (
              <Pressable onPress={fetchPreview} hitSlop={8}>
                <RefreshCw color={colors.accent} size={18} />
              </Pressable>
            )}
          </View>
          <Text style={s.hint}>Tipp: Amazon-Links sind nicht erlaubt. Nutze den Direktlink vom Shop.</Text>

          {loadingPreview && (
            <View style={s.loading}>
              <ActivityIndicator color={colors.accent} />
              <Text style={s.loadingText}>Lade Produkt-Infos...</Text>
            </View>
          )}

          {preview && (
            <>
              <View style={s.previewCard}>
                {preview.image ? (
                  <Image source={{ uri: preview.image }} style={s.previewImage} />
                ) : (
                  <View style={[s.previewImage, s.noImage]}>
                    <Text style={s.noImageText}>Kein Bild gefunden</Text>
                  </View>
                )}
                <View style={s.previewMeta}>
                  <Text style={s.previewDomain}>{preview.domain}</Text>
                  {preview.price != null && (
                    <Text style={s.previewPrice}>{preview.price.toFixed(2)} €</Text>
                  )}
                </View>
                <Pressable onPress={clearPreview} style={s.clearBtn} hitSlop={8}>
                  <X color={colors.white} size={18} />
                </Pressable>
              </View>

              <Text style={s.label}>Titel</Text>
              <TextInput
                style={s.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Produkt-Name"
                placeholderTextColor={colors.gray}
                maxLength={200}
              />

              <Text style={s.label}>Deine Beschreibung <Text style={s.labelOpt}>optional</Text></Text>
              <TextInput
                style={[s.input, { height: 90 }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Warum empfiehlst du dieses Produkt? (max. 500 Zeichen)"
                placeholderTextColor={colors.gray}
                multiline
                maxLength={500}
              />
              <Text style={s.counter}>{description.length}/500</Text>

              <Text style={s.label}>In welcher Community posten?</Text>
              {communities.length === 0 ? (
                <View style={s.emptyComm}>
                  <Text style={s.emptyCommText}>Du bist noch in keiner Community.</Text>
                  <Pressable onPress={() => router.replace("/create-community")}>
                    <Text style={s.emptyCommLink}>Jetzt erstellen</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={s.commList}>
                  {communities.map((c) => (
                    <Pressable
                      key={c.id}
                      style={[s.commOption, selectedCid === c.id && s.commOptionOn]}
                      onPress={() => setSelectedCid(c.id)}
                    >
                      <Text style={[s.commOptionText, selectedCid === c.id && s.commOptionTextOn]}>
                        {c.name}
                      </Text>
                      <Text style={s.commOptionMeta}>{c.member_count} Mitglieder</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <View style={s.disclosure}>
                <Text style={s.disclosureText}>
                  🔗 Beim Posten hängt TrusCart automatisch deinen Usernamen an den Link. So sehen Marken, dass du das Produkt empfohlen hast.
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  title: { color: colors.white, fontSize: 17, fontWeight: "600" },
  postBtn: { color: colors.accent, fontSize: 16, fontWeight: "700" },
  label: { color: colors.white, fontSize: 13, fontWeight: "600", marginTop: 16, marginBottom: 6 },
  labelOpt: { color: colors.gray, fontWeight: "400" },
  urlRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgInput,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  urlInput: { flex: 1, color: colors.white, fontSize: 15 },
  hint: { color: colors.gray, fontSize: 11, marginTop: 6 },
  loading: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 24, justifyContent: "center" },
  loadingText: { color: colors.gray, fontSize: 13 },
  previewCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 14,
    position: "relative",
  },
  previewImage: { width: "100%", aspectRatio: 1, backgroundColor: colors.bgInput },
  noImage: { justifyContent: "center", alignItems: "center" },
  noImageText: { color: colors.gray, fontSize: 13 },
  previewMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12 },
  previewDomain: { color: colors.gray, fontSize: 12 },
  previewPrice: { color: colors.accent, fontSize: 16, fontWeight: "700" },
  clearBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  input: { backgroundColor: colors.bgInput, borderRadius: 10, padding: 14, color: colors.white, fontSize: 15 },
  counter: { color: colors.gray, fontSize: 11, textAlign: "right", marginTop: 4 },
  emptyComm: { backgroundColor: colors.bgCard, padding: 14, borderRadius: 10, alignItems: "center" },
  emptyCommText: { color: colors.gray, fontSize: 13, marginBottom: 6 },
  emptyCommLink: { color: colors.accent, fontSize: 14, fontWeight: "600" },
  commList: { gap: 6 },
  commOption: {
    backgroundColor: colors.bgCard,
    borderRadius: 10,
    padding: 14,
    borderWidth: 2,
    borderColor: "transparent",
  },
  commOptionOn: { borderColor: colors.accent },
  commOptionText: { color: colors.white, fontSize: 14, fontWeight: "600" },
  commOptionTextOn: { color: colors.accent },
  commOptionMeta: { color: colors.gray, fontSize: 11, marginTop: 2 },
  disclosure: {
    backgroundColor: colors.bgCard,
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  disclosureText: { color: colors.gray, fontSize: 12, lineHeight: 17 },
});
