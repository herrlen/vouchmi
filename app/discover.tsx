import { useEffect, useState, useMemo } from "react";
import { View, Text, FlatList, TextInput, Image, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { ChevronLeft, Search as SearchIcon } from "lucide-react-native";
import { communities as communitiesApi, type Community } from "../src/lib/api";
import { useApp } from "../src/lib/store";
import { colors } from "../src/constants/theme";

const CATEGORY_EMOJIS: Record<string, string> = {
  fashion: "👗", mode: "👗", beauty: "💄", tech: "💻", technologie: "💻",
  food: "🍝", essen: "🍝", fitness: "🏋", sport: "🏋",
  sustainability: "🌱", nachhaltigkeit: "🌱", books: "📚", bücher: "📚",
  audio: "🎧", musik: "🎧", reisen: "✈️", gaming: "🎮",
  interior: "🏠", familie: "👶", eltern: "👶",
};

function getEmoji(c: Community): string {
  const cat = (c.category ?? c.name).toLowerCase();
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJIS)) {
    if (cat.includes(key)) return emoji;
  }
  return "💬";
}

function getAccent(c: Community): string {
  const cat = (c.category ?? c.name).toLowerCase();
  if (cat.includes("fashion") || cat.includes("mode") || cat.includes("beauty")) return "#F472B6";
  if (cat.includes("tech") || cat.includes("bücher") || cat.includes("books")) return "#4F46E5";
  if (cat.includes("food") || cat.includes("audio") || cat.includes("musik")) return "#F59E0B";
  if (cat.includes("nachhaltig") || cat.includes("fitness") || cat.includes("sport") || cat.includes("familie") || cat.includes("eltern")) return "#10B981";
  const fallbacks = ["#F59E0B", "#4F46E5", "#10B981", "#F472B6"];
  let h = 0;
  for (let i = 0; i < c.name.length; i++) h = c.name.charCodeAt(i) + ((h << 5) - h);
  return fallbacks[Math.abs(h) % fallbacks.length];
}

export default function DiscoverScreen() {
  const [allCommunities, setAllCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const loadMine = useApp((s) => s.loadCommunities);

  useEffect(() => {
    communitiesApi.discover()
      .then((r) => setAllCommunities(r.communities))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return allCommunities;
    const q = search.toLowerCase();
    return allCommunities.filter((c) =>
      c.name.toLowerCase().includes(q) || (c.category ?? "").toLowerCase().includes(q)
    );
  }, [allCommunities, search]);

  const handleJoin = async (c: Community) => {
    setJoining(c.id);
    try {
      await communitiesApi.join(c.id);
      await loadMine();
      router.replace(`/community/${c.id}`);
    } catch {} finally { setJoining(null); }
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
          <ChevronLeft color="#FFFFFF" size={24} strokeWidth={2} />
        </Pressable>
        <Text style={s.headerTitle}>Entdecken</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <View style={s.searchBar}>
          <SearchIcon color="#64748B" size={18} strokeWidth={2} />
          <TextInput
            style={s.searchInput}
            placeholder="Community suchen…"
            placeholderTextColor="#64748B"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
              <Text style={s.emptyTitle}>
                {search.trim() ? "Keine Treffer" : "Noch keine Communities"}
              </Text>
              <Text style={s.emptyText}>
                {search.trim() ? `Keine Community für „${search}" gefunden.` : "Erstelle die erste Community!"}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const accent = getAccent(item);
            const emoji = getEmoji(item);
            const isMember = item.is_member || item.my_role === "owner";
            return (
              <Pressable style={s.card} onPress={() => router.push(`/community/${item.id}`)}>
                <View style={[s.cardOverlay, { backgroundColor: accent + "10" }]} />
                <View style={s.cardContent}>
                  <View style={[s.emojiBox, { backgroundColor: accent + "25" }]}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={s.emojiImg} />
                    ) : (
                      <Text style={{ fontSize: 24 }}>{emoji}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
                    <Text style={s.cardMeta}>{item.member_count} Mitglieder{item.category ? ` · ${item.category}` : ""}</Text>
                    {item.description && <Text style={s.cardDesc} numberOfLines={2}>{item.description}</Text>}
                  </View>
                  {isMember ? (
                    <View style={[s.joinBtn, { backgroundColor: "transparent", borderWidth: 1.5, borderColor: accent }]}>
                      <Text style={[s.joinText, { color: accent }]}>Mitglied</Text>
                    </View>
                  ) : (
                    <Pressable
                      style={[s.joinBtn, { backgroundColor: accent }, joining === item.id && { opacity: 0.5 }]}
                      onPress={() => handleJoin(item)}
                      disabled={joining === item.id}
                    >
                      <Text style={[s.joinText, { color: accent === "#F59E0B" ? "#1A1D2E" : "#FFFFFF" }]}>Join</Text>
                    </Pressable>
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0E1A" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 8 },
  backBtn: { minWidth: 44, minHeight: 44, justifyContent: "center" },
  headerTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },

  searchWrap: { paddingHorizontal: 16, paddingBottom: 12 },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#141926", borderRadius: 20, paddingHorizontal: 16, height: 44, gap: 10 },
  searchInput: { flex: 1, color: "#FFFFFF", fontSize: 15, height: 44 },

  card: { backgroundColor: "#141926", borderRadius: 18, marginBottom: 10, overflow: "hidden" },
  cardOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: 18 },
  cardContent: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  emojiBox: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center", overflow: "hidden" },
  emojiImg: { width: 48, height: 48, borderRadius: 14 },
  cardName: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  cardMeta: { color: "#94A3B8", fontSize: 12, marginTop: 2 },
  cardDesc: { color: "#64748B", fontSize: 12, lineHeight: 16, marginTop: 4 },

  joinBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, minHeight: 34, justifyContent: "center" },
  joinText: { fontSize: 13, fontWeight: "700" },

  empty: { alignItems: "center", paddingTop: 60 },
  emptyTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", marginBottom: 6 },
  emptyText: { color: "#64748B", fontSize: 14, textAlign: "center" },
});
