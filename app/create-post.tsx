import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, Alert, ScrollView, Image, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { X, Link as LinkIcon, RefreshCw, ArrowRight, ShoppingBag, Users, TrendingUp } from "lucide-react-native";
import { links, feed as feedApi, communities as communitiesApi, type LinkPreview, type Community } from "../src/lib/api";

// Blocked domains
const BLOCKED_DOMAINS = ["amazon", "amzn", "ebay"];
function isBlocked(url: string): boolean {
  const lower = url.toLowerCase();
  return BLOCKED_DOMAINS.some((d) => lower.includes(d));
}

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
  const [urlError, setUrlError] = useState<string | null>(null);

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

  const fetchPreview = async (rawUrl?: string, silent = false) => {
    const clean = (rawUrl ?? url).trim();
    if (!clean) return;
    if (!/^https?:\/\//i.test(clean)) {
      if (!silent) setUrlError("Der Link muss mit https:// beginnen.");
      return;
    }
    if (isBlocked(clean)) {
      setUrlError("Amazon- und eBay-Links sind auf Vouchmi nicht erlaubt. Nutze den Direktlink vom Shop.");
      return;
    }
    setUrlError(null);
    setLoadingPreview(true);
    setPreview(null);
    try {
      const { preview: p } = await links.preview(clean);
      setPreview(p);
      setTitle(p.title ?? "");
      setDescription(p.description ?? "");
    } catch (e: any) {
      if (!silent) setUrlError(e.message ?? "Preview fehlgeschlagen.");
    }
    setLoadingPreview(false);
  };

  useEffect(() => {
    const clean = url.trim();
    if (!clean || !/^https?:\/\//i.test(clean)) return;
    if (isBlocked(clean)) {
      setUrlError("Amazon- und eBay-Links sind auf Vouchmi nicht erlaubt.");
      return;
    }
    setUrlError(null);
    if (preview && preview.original_url === clean) return;
    const timer = setTimeout(() => fetchPreview(clean, true), 600);
    return () => clearTimeout(timer);
  }, [url]);

  const clearPreview = () => {
    setPreview(null);
    setUrl("");
    setTitle("");
    setDescription("");
    setUrlError(null);
  };

  const submit = async () => {
    if (!preview) return;
    if (!title.trim()) return Alert.alert("Titel fehlt", "Gib einen Titel ein.");
    if (!selectedCid) return Alert.alert("Community wählen", "Wähle eine Community.");
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

  const canSubmit = !!preview && !!selectedCid && !!title.trim() && !submitting;

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.headerBtn}>
          <X color="#FFFFFF" size={22} strokeWidth={2} />
        </Pressable>
        <Text style={s.headerTitle}>Empfehlung teilen</Text>
        <Pressable onPress={submit} disabled={!canSubmit} hitSlop={10} style={s.headerBtn}>
          <Text style={[s.postBtn, !canSubmit && { opacity: 0.3 }]}>{submitting ? "..." : "Posten"}</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={40}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">

          {/* URL Input */}
          <Text style={s.label}>PRODUKT-LINK</Text>
          <View style={[s.urlRow, urlError && s.urlRowError]}>
            <LinkIcon color={urlError ? "#F472B6" : "#64748B"} size={18} />
            <TextInput
              style={s.urlInput}
              placeholder="https://shop.de/produkt..."
              placeholderTextColor="#4A5068"
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={() => fetchPreview()}
            />
            {!!url && (
              <Pressable onPress={() => fetchPreview()} hitSlop={8}>
                <RefreshCw color="#F59E0B" size={18} />
              </Pressable>
            )}
          </View>
          {urlError && <Text style={s.errorText}>{urlError}</Text>}
          {!urlError && !preview && !loadingPreview && (
            <Text style={s.hintText}>Amazon- und eBay-Links sind nicht erlaubt. Nutze den Direktlink vom Shop.</Text>
          )}

          {/* Loading */}
          {loadingPreview && (
            <View style={s.loadingWrap}>
              <ActivityIndicator color="#F59E0B" />
              <Text style={s.loadingText}>Lade Produkt-Infos...</Text>
            </View>
          )}

          {/* Empty state — show how it works */}
          {!preview && !loadingPreview && !url.trim() && (
            <View style={s.onboarding}>
              <Text style={s.onboardingTitle}>So funktioniert's</Text>
              <Text style={s.onboardingSub}>Teile deine Lieblingsprodukte mit deiner Community.</Text>

              <View style={s.stepList}>
                <StepItem
                  number="1"
                  icon={<LinkIcon color="#F59E0B" size={18} strokeWidth={2} />}
                  title="Link einfügen"
                  desc="Kopiere den Produkt-Link aus dem Online-Shop und füge ihn oben ein."
                />
                <StepItem
                  number="2"
                  icon={<ShoppingBag color="#6366F1" size={18} strokeWidth={2} />}
                  title="Produkt-Preview"
                  desc="Vouchmi lädt automatisch Bild, Titel und Preis — du kannst alles anpassen."
                />
                <StepItem
                  number="3"
                  icon={<Users color="#10B981" size={18} strokeWidth={2} />}
                  title="Community wählen"
                  desc="Wähle in welcher Community deine Empfehlung erscheinen soll."
                />
                <StepItem
                  number="4"
                  icon={<TrendingUp color="#F472B6" size={18} strokeWidth={2} />}
                  title="Posten & entdeckt werden"
                  desc="Dein Link wird automatisch mit UTM-Tracking versehen — Marken sehen deinen Beitrag."
                />
              </View>

              <View style={s.tipBox}>
                <Text style={s.tipTitle}>💡 Tipp</Text>
                <Text style={s.tipText}>Schreib dazu, warum du das Produkt empfiehlst. Persönliche Erfahrungen bekommen mehr Likes!</Text>
              </View>
            </View>
          )}

          {/* Preview loaded */}
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
                  <X color="#FFFFFF" size={16} />
                </Pressable>
              </View>

              <Text style={s.label}>TITEL</Text>
              <TextInput style={s.input} value={title} onChangeText={setTitle}
                placeholder="Produkt-Name" placeholderTextColor="#4A5068" maxLength={200} />

              <Text style={s.label}>BESCHREIBUNG <Text style={s.labelOpt}>optional</Text></Text>
              <TextInput style={[s.input, { minHeight: 80, textAlignVertical: "top" }]}
                value={description} onChangeText={setDescription}
                placeholder="Warum empfiehlst du das?" placeholderTextColor="#4A5068"
                multiline maxLength={500} />
              <Text style={s.counter}>{description.length}/500</Text>

              <Text style={s.label}>COMMUNITY</Text>
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
                    <Pressable key={c.id} style={[s.commChip, selectedCid === c.id && s.commChipOn]} onPress={() => setSelectedCid(c.id)}>
                      <Text style={[s.commChipText, selectedCid === c.id && s.commChipTextOn]}>{c.name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <View style={s.disclosure}>
                <Text style={s.disclosureText}>
                  🔗 Vouchmi hängt automatisch UTM-Tracking an deinen Link. So sehen Marken, dass du das Produkt empfohlen hast — ohne Kosten für dich.
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StepItem({ number, icon, title, desc }: { number: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <View style={s.step}>
      <View style={s.stepIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={s.stepTitle}>{title}</Text>
        <Text style={s.stepDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0E1A" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: "#1E2235" },
  headerBtn: { width: 50, minHeight: 44, justifyContent: "center" },
  headerTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
  postBtn: { color: "#F59E0B", fontSize: 16, fontWeight: "800", textAlign: "right" },

  label: { color: "#94A3B8", fontSize: 11, fontWeight: "600", letterSpacing: 1.5, marginTop: 20, marginBottom: 8 },
  labelOpt: { fontWeight: "400", letterSpacing: 0 },

  urlRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#141926", borderRadius: 14, paddingHorizontal: 14, height: 52, gap: 10, borderWidth: 1.5, borderColor: "#1E2235" },
  urlRowError: { borderColor: "#F472B6" },
  urlInput: { flex: 1, color: "#FFFFFF", fontSize: 15 },
  errorText: { color: "#F472B6", fontSize: 12, marginTop: 6, paddingHorizontal: 4 },
  hintText: { color: "#4A5068", fontSize: 11, marginTop: 6, paddingHorizontal: 4 },

  loadingWrap: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 24, justifyContent: "center" },
  loadingText: { color: "#94A3B8", fontSize: 13 },

  // Onboarding empty state
  onboarding: { marginTop: 28 },
  onboardingTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "800", marginBottom: 6 },
  onboardingSub: { color: "#94A3B8", fontSize: 14, lineHeight: 20, marginBottom: 24 },
  stepList: { gap: 16 },
  step: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  stepIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#141926", justifyContent: "center", alignItems: "center" },
  stepTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  stepDesc: { color: "#64748B", fontSize: 13, lineHeight: 18, marginTop: 2 },
  tipBox: { backgroundColor: "#141926", borderRadius: 14, padding: 16, marginTop: 24, borderLeftWidth: 3, borderLeftColor: "#F59E0B" },
  tipTitle: { color: "#FFFFFF", fontSize: 14, fontWeight: "700", marginBottom: 4 },
  tipText: { color: "#94A3B8", fontSize: 13, lineHeight: 19 },

  // Preview
  previewCard: { backgroundColor: "#141926", borderRadius: 16, overflow: "hidden", marginTop: 14, position: "relative" },
  previewImage: { width: "100%", aspectRatio: 4 / 5, backgroundColor: "#FFFFFF", resizeMode: "contain" },
  noImage: { justifyContent: "center", alignItems: "center", backgroundColor: "#141926" },
  noImageText: { color: "#64748B", fontSize: 13 },
  previewMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12 },
  previewDomain: { color: "#94A3B8", fontSize: 12 },
  previewPrice: { color: "#F59E0B", fontSize: 16, fontWeight: "800" },
  clearBtn: { position: "absolute", top: 10, right: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },

  input: { backgroundColor: "#141926", borderRadius: 12, padding: 14, color: "#FFFFFF", fontSize: 15, borderWidth: 1, borderColor: "#1E2235" },
  counter: { color: "#4A5068", fontSize: 11, textAlign: "right", marginTop: 4 },

  emptyComm: { backgroundColor: "#141926", padding: 16, borderRadius: 12, alignItems: "center" },
  emptyCommText: { color: "#64748B", fontSize: 13, marginBottom: 6 },
  emptyCommLink: { color: "#F59E0B", fontSize: 14, fontWeight: "700" },
  commList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  commChip: { backgroundColor: "#141926", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: "transparent" },
  commChipOn: { borderColor: "#F59E0B" },
  commChipText: { color: "#94A3B8", fontSize: 13, fontWeight: "600" },
  commChipTextOn: { color: "#FFFFFF" },
  disclosure: { backgroundColor: "#141926", borderRadius: 12, padding: 14, marginTop: 20, borderLeftWidth: 3, borderLeftColor: "#F59E0B" },
  disclosureText: { color: "#94A3B8", fontSize: 12, lineHeight: 17 },
});
