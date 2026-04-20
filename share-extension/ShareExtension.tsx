import { useEffect, useState, useMemo } from "react";
import { View, Text, Pressable, StyleSheet, TextInput, Image, ActivityIndicator, Alert, ScrollView, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { close } from "expo-share-extension";

const API = "https://app.vouchmi.com/api";

const KEYCHAIN_OPTS: SecureStore.SecureStoreOptions | undefined = Platform.OS === "ios"
  ? { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK, keychainService: "group.com.vouchmi.app" }
  : undefined;

type Community = { id: string; name: string; member_count: number; category?: string | null };
type Preview = { title: string | null; image: string | null; domain: string; price: number | null };

async function apiGet<T>(path: string, token: string): Promise<T> {
  const r = await fetch(`${API}${path}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function apiPost<T>(path: string, body: any, token: string): Promise<T> {
  const r = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text();
    let msg = `HTTP ${r.status}`;
    try { msg = JSON.parse(text).message ?? msg; } catch {}
    throw new Error(msg);
  }
  return r.json();
}

export default function ShareExtension({ url }: { url?: string }) {
  const sharedUrl = url ?? "";

  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [commLoading, setCommLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Load auth token from shared keychain
  useEffect(() => {
    SecureStore.getItemAsync("token", KEYCHAIN_OPTS)
      .then((t) => setToken(t))
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, []);

  // Load preview + communities once we have a token
  useEffect(() => {
    if (!token || !sharedUrl) return;

    fetch(`${API}/link-preview?url=${encodeURIComponent(sharedUrl)}`, {
      headers: { Accept: "application/json" },
    })
      .then((r) => r.json())
      .then((d) => setPreview(d.preview ?? null))
      .catch(() => {})
      .finally(() => setPreviewLoading(false));

    apiGet<{ communities: Community[] }>("/communities", token)
      .then((d) => {
        setCommunities(d.communities);
        if (d.communities.length === 1) setSelectedId(d.communities[0].id);
      })
      .catch(() => {})
      .finally(() => setCommLoading(false));
  }, [token, sharedUrl]);

  const canSubmit = useMemo(() => !!selectedId && !posting && !!token, [selectedId, posting, token]);

  const handlePost = async () => {
    if (!canSubmit || !selectedId || !token) return;
    setPosting(true);
    try {
      await apiPost(`/communities/${selectedId}/feed`, {
        link_url: sharedUrl,
        content: comment.trim() || undefined,
        link_title: preview?.title ?? undefined,
        link_image: preview?.image ?? undefined,
        link_price: preview?.price ?? undefined,
      }, token);
      setSuccess(true);
      setTimeout(() => close(), 1500);
    } catch (e: any) {
      Alert.alert("Fehler", e.message ?? "Konnte nicht posten.");
      setPosting(false);
    }
  };

  // Not logged in
  if (!authLoading && !token) {
    return (
      <View style={s.container}>
        <View style={s.centered}>
          <View style={s.logoMark}><Text style={s.logoV}>V</Text></View>
          <Text style={s.title}>Bitte zuerst einloggen</Text>
          <Text style={s.subtitle}>Öffne die Vouchmi App und melde dich an.</Text>
          <Pressable style={s.closeBtn} onPress={() => close()}>
            <Text style={s.closeBtnText}>Schließen</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Success
  if (success) {
    return (
      <View style={s.container}>
        <View style={s.centered}>
          <Text style={{ fontSize: 48 }}>✅</Text>
          <Text style={s.title}>Empfohlen!</Text>
          <Text style={s.subtitle}>Deine Empfehlung wurde geteilt.</Text>
        </View>
      </View>
    );
  }

  // Loading
  if (authLoading) {
    return (
      <View style={s.container}>
        <View style={s.centered}>
          <ActivityIndicator color="#F59E0B" size="large" />
        </View>
      </View>
    );
  }

  const domain = sharedUrl ? extractDomain(sharedUrl) : "";

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => close()} hitSlop={12}>
          <Text style={s.cancelText}>Abbrechen</Text>
        </Pressable>
        <View style={s.headerCenter}>
          <View style={s.logoMarkSmall}><Text style={s.logoVSmall}>V</Text></View>
          <Text style={s.headerTitle}>Empfehlen</Text>
        </View>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {/* Preview */}
        <View style={s.previewCard}>
          {previewLoading ? (
            <ActivityIndicator color="#F59E0B" style={{ padding: 30 }} />
          ) : (
            <View style={s.previewRow}>
              {preview?.image ? (
                <Image source={{ uri: preview.image }} style={s.previewImg} />
              ) : (
                <View style={[s.previewImg, s.previewImgFallback]}>
                  <Text style={s.previewInitial}>{domain.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={s.previewInfo}>
                <Text style={s.previewTitle} numberOfLines={2}>{preview?.title ?? domain}</Text>
                <Text style={s.previewDomain}>{domain}</Text>
                {preview?.price != null && <Text style={s.previewPrice}>{preview.price.toFixed(2)} €</Text>}
              </View>
            </View>
          )}
        </View>

        {/* Community picker (compact) */}
        <Text style={s.sectionLabel}>COMMUNITY</Text>
        {commLoading ? (
          <ActivityIndicator color="#F59E0B" style={{ padding: 16 }} />
        ) : communities.length === 0 ? (
          <Text style={s.emptyText}>Noch in keiner Community.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
            {communities.map((c) => {
              const sel = c.id === selectedId;
              return (
                <Pressable key={c.id} style={[s.chip, sel && s.chipSelected]} onPress={() => setSelectedId(c.id)}>
                  <Text style={[s.chipText, sel && s.chipTextSelected]}>{c.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* Comment */}
        <TextInput
          style={s.commentInput}
          placeholder="Warum empfiehlst du das?"
          placeholderTextColor="#4A5068"
          value={comment}
          onChangeText={setComment}
          multiline
          maxLength={280}
        />
      </ScrollView>

      {/* CTA */}
      <View style={s.footer}>
        <Pressable style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]} onPress={handlePost} disabled={!canSubmit}>
          {posting ? <ActivityIndicator color="#1A1D2E" /> : <Text style={s.submitText}>Vouchen</Text>}
        </Pressable>
      </View>
    </View>
  );
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "rgba(26,29,46,0.97)", borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },

  logoMark: { width: 56, height: 56, borderRadius: 16, backgroundColor: "#F59E0B", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  logoV: { color: "#1A1D2E", fontSize: 28, fontWeight: "800" },
  logoMarkSmall: { width: 28, height: 28, borderRadius: 8, backgroundColor: "#F59E0B", justifyContent: "center", alignItems: "center" },
  logoVSmall: { color: "#1A1D2E", fontSize: 14, fontWeight: "800" },

  title: { color: "#FFFFFF", fontSize: 20, fontWeight: "800", textAlign: "center", marginBottom: 6 },
  subtitle: { color: "#94A3B8", fontSize: 14, textAlign: "center" },
  closeBtn: { backgroundColor: "#141926", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 24 },
  closeBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },

  // Header
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: "#1E2235" },
  cancelText: { color: "#94A3B8", fontSize: 14, width: 70 },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },

  content: { padding: 16, gap: 16 },

  // Preview
  previewCard: { backgroundColor: "#141926", borderRadius: 16, overflow: "hidden" },
  previewRow: { flexDirection: "row", padding: 12, gap: 12 },
  previewImg: { width: 72, height: 72, borderRadius: 12, backgroundColor: "#252941" },
  previewImgFallback: { justifyContent: "center", alignItems: "center" },
  previewInitial: { color: "#F59E0B", fontSize: 28, fontWeight: "800" },
  previewInfo: { flex: 1, justifyContent: "center" },
  previewTitle: { color: "#FFFFFF", fontSize: 14, fontWeight: "700", lineHeight: 19 },
  previewDomain: { color: "#94A3B8", fontSize: 11, marginTop: 2 },
  previewPrice: { color: "#F59E0B", fontSize: 14, fontWeight: "800", marginTop: 4 },

  // Community chips
  sectionLabel: { color: "#94A3B8", fontSize: 11, fontWeight: "600", letterSpacing: 1.5 },
  chipRow: { gap: 8, paddingVertical: 4 },
  chip: { backgroundColor: "#141926", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: "transparent" },
  chipSelected: { borderColor: "#F59E0B", backgroundColor: "#1A1D2E" },
  chipText: { color: "#94A3B8", fontSize: 13, fontWeight: "600" },
  chipTextSelected: { color: "#FFFFFF" },
  emptyText: { color: "#4A5068", fontSize: 13 },

  // Comment
  commentInput: { backgroundColor: "#141926", borderRadius: 12, padding: 14, color: "#FFFFFF", fontSize: 14, minHeight: 70, textAlignVertical: "top" },

  // Footer
  footer: { padding: 16, borderTopWidth: 0.5, borderTopColor: "#1E2235" },
  submitBtn: { backgroundColor: "#F59E0B", height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  submitBtnDisabled: { opacity: 0.3 },
  submitText: { color: "#1A1D2E", fontSize: 15, fontWeight: "800" },
});
