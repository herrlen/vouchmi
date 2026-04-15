import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Share, ActivityIndicator, Linking, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Copy, ExternalLink, Trash2 } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { useLinkStore } from "../../src/lib/link-store";
import type { LinkStats } from "../../src/lib/api";
import { colors } from "../../src/constants/theme";

export default function LinkStatsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const fetchStats = useLinkStore((s) => s.fetchStats);
  const removeLink = useLinkStore((s) => s.removeLink);

  const [stats, setStats] = useState<LinkStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const r = await fetchStats(id);
      setStats(r);
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    } finally { setLoading(false); }
  }, [id, fetchStats]);

  useEffect(() => { load(); }, [load]);

  const copyLink = async () => {
    if (!stats) return;
    await Clipboard.setStringAsync(stats.link.short_url);
    Alert.alert("Kopiert", "Kurzlink wurde in die Zwischenablage kopiert.");
  };

  const shareLink = async () => {
    if (!stats) return;
    try { await Share.share({ message: stats.link.short_url }); } catch {}
  };

  const confirmDelete = () => {
    if (!stats) return;
    Alert.alert("Link löschen?", "Der Kurzlink funktioniert danach nicht mehr.", [
      { text: "Abbrechen", style: "cancel" },
      { text: "Löschen", style: "destructive", onPress: async () => {
        await removeLink(stats.link.id);
        router.back();
      } },
    ]);
  };

  if (loading || !stats) {
    return (
      <SafeAreaView style={s.container} edges={["top"]}>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const max = Math.max(1, ...stats.clicks_per_day.map((d) => d.clicks));

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.iconBtn} hitSlop={10}>
          <ChevronLeft color={colors.white} size={26} strokeWidth={2} />
        </Pressable>
        <Text style={s.title}>Statistiken</Text>
        <Pressable onPress={confirmDelete} style={s.iconBtn} hitSlop={10} accessibilityRole="button" accessibilityLabel="Link löschen">
          <Trash2 color={colors.red} size={20} strokeWidth={2} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {stats.link.og_image && (
          <Image source={{ uri: stats.link.og_image }} style={s.hero} />
        )}

        <Text style={s.linkTitle} numberOfLines={2}>{stats.link.og_title ?? stats.link.domain}</Text>
        <Text style={s.domain}>{stats.link.domain}</Text>

        <View style={s.shortBox}>
          <Text style={s.shortLabel}>KURZLINK</Text>
          <Pressable onPress={copyLink} accessibilityRole="button" accessibilityLabel="Kurzlink kopieren">
            <Text style={s.shortUrl} selectable>{stats.link.short_url}</Text>
          </Pressable>
          <View style={s.shortBtns}>
            <Pressable style={s.shortBtn} onPress={copyLink}>
              <Copy color={colors.white} size={14} />
              <Text style={s.shortBtnText}>Kopieren</Text>
            </Pressable>
            <Pressable style={s.shortBtn} onPress={shareLink}>
              <ExternalLink color={colors.white} size={14} />
              <Text style={s.shortBtnText}>Teilen</Text>
            </Pressable>
          </View>
        </View>

        <View style={s.kpiRow}>
          <Kpi value={stats.click_count} label="Gesamt" />
          <Kpi value={stats.clicks_today} label="Heute" />
          <Kpi value={stats.clicks_last_7_days} label="7 Tage" />
          <Kpi value={stats.clicks_last_30_days} label="30 Tage" />
        </View>

        <Text style={s.sectionTitle}>Klicks pro Tag (30 Tage)</Text>
        <View style={s.chart}>
          {stats.clicks_per_day.map((d) => (
            <View key={d.date} style={s.barColumn}>
              <View style={[s.bar, { height: (d.clicks / max) * 100 }]} />
            </View>
          ))}
        </View>

        <Pressable style={s.openBtn} onPress={() => Linking.openURL(stats.link.target_url)}>
          <Text style={s.openBtnText}>Zielseite öffnen</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Kpi({ value, label }: { value: number; label: string }) {
  return (
    <View style={s.kpi}>
      <Text style={s.kpiValue}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, paddingVertical: 4 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { color: colors.white, fontSize: 18, fontWeight: "700" },

  hero: { width: "100%", height: 180, borderRadius: 14, backgroundColor: colors.bgCard, marginBottom: 12 },
  linkTitle: { color: colors.white, fontSize: 18, fontWeight: "700", lineHeight: 24 },
  domain: { color: colors.gray, fontSize: 12, marginTop: 4, marginBottom: 18 },

  shortBox: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 14, marginBottom: 18 },
  shortLabel: { color: colors.gray, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 },
  shortUrl: { color: colors.accent, fontSize: 15, fontWeight: "700" },
  shortBtns: { flexDirection: "row", gap: 10, marginTop: 12 },
  shortBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "rgba(79,70,229,0.2)", borderRadius: 10 },
  shortBtnText: { color: colors.white, fontSize: 13, fontWeight: "600" },

  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  kpi: { flex: 1, backgroundColor: colors.bgCard, borderRadius: 12, padding: 12, alignItems: "center" },
  kpiValue: { color: colors.white, fontSize: 20, fontWeight: "800" },
  kpiLabel: { color: colors.gray, fontSize: 11, marginTop: 2 },

  sectionTitle: { color: colors.white, fontSize: 14, fontWeight: "700", marginBottom: 10 },
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 2, height: 110, backgroundColor: colors.bgCard, padding: 12, borderRadius: 12, marginBottom: 20 },
  barColumn: { flex: 1, height: "100%", justifyContent: "flex-end" },
  bar: { backgroundColor: colors.accent, borderRadius: 2, minHeight: 2 },

  openBtn: { backgroundColor: colors.accent, padding: 14, borderRadius: 14, alignItems: "center" },
  openBtnText: { color: "#0A0E1A", fontWeight: "800", fontSize: 15 },
});
