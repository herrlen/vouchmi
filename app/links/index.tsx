import { useCallback, useEffect } from "react";
import { View, Text, FlatList, StyleSheet, Pressable, Image, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useFocusEffect } from "expo-router";
import { ChevronLeft, Link as LinkIcon, BarChart3 } from "lucide-react-native";
import { useLinkStore } from "../../src/lib/link-store";
import { colors } from "../../src/constants/theme";
import type { SharedLink } from "../../src/lib/api";

export default function MyLinksScreen() {
  const items = useLinkStore((s) => s.items);
  const loading = useLinkStore((s) => s.loading);
  const fetchLinks = useLinkStore((s) => s.fetchLinks);

  useFocusEffect(useCallback(() => { fetchLinks(); }, [fetchLinks]));
  useEffect(() => { fetchLinks(); }, [fetchLinks]);

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.iconBtn} hitSlop={10} accessibilityRole="button" accessibilityLabel="Zurück">
          <ChevronLeft color={colors.white} size={26} strokeWidth={2} />
        </Pressable>
        <Text style={s.title}>Meine Links</Text>
        <View style={s.iconBtn} />
      </View>

      {loading && items.length === 0 ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(l) => l.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchLinks} tintColor={colors.accent} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => <LinkRow link={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function LinkRow({ link }: { link: SharedLink }) {
  return (
    <Pressable style={s.row} onPress={() => router.push(`/links/${link.id}`)} accessibilityRole="button">
      {link.og_image ? (
        <Image source={{ uri: link.og_image }} style={s.thumb} />
      ) : (
        <View style={[s.thumb, s.thumbFallback]}>
          <LinkIcon color={colors.gray} size={20} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle} numberOfLines={2}>{link.og_title ?? link.domain}</Text>
        <Text style={s.rowMeta}>{link.domain}</Text>
        <View style={s.rowStats}>
          <BarChart3 color={colors.accent} size={12} strokeWidth={2} />
          <Text style={s.rowStatsText}>{link.click_count} Klick{link.click_count === 1 ? "" : "s"}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function EmptyState() {
  return (
    <View style={s.empty}>
      <Text style={{ fontSize: 48, marginBottom: 12 }}>🔗</Text>
      <Text style={s.emptyTitle}>Du hast noch keine Links geteilt</Text>
      <Text style={s.emptyBody}>Sobald du eine Empfehlung in einer Community postest, erscheint sie hier mit Klick-Statistiken.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, paddingVertical: 4 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { color: colors.white, fontSize: 18, fontWeight: "700" },

  row: { flexDirection: "row", gap: 12, backgroundColor: colors.bgCard, padding: 12, borderRadius: 14 },
  thumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: colors.bgInput },
  thumbFallback: { alignItems: "center", justifyContent: "center" },
  rowTitle: { color: colors.white, fontSize: 14, fontWeight: "700", lineHeight: 18 },
  rowMeta: { color: colors.gray, fontSize: 12, marginTop: 2 },
  rowStats: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  rowStatsText: { color: colors.accent, fontSize: 12, fontWeight: "600" },

  empty: { alignItems: "center", paddingVertical: 80, paddingHorizontal: 40 },
  emptyTitle: { color: colors.white, fontSize: 17, fontWeight: "700", marginBottom: 6, textAlign: "center" },
  emptyBody: { color: colors.gray, fontSize: 13, lineHeight: 19, textAlign: "center" },
});
