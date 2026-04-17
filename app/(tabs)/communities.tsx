import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, RefreshControl, ActivityIndicator, Alert, Image, Share, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search as SearchIcon, Plus } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { colors } from "../../src/constants/theme";
import { useAuth } from "../../src/lib/store";
import { communities as communitiesApi, type Community } from "../../src/lib/api";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_GAP = 10;
const CARD_W = (SCREEN_W - 12 * 2 - CARD_GAP) / 2;

const CATEGORY_COLORS: Record<string, string> = {
  fashion: "#F472B6",
  mode: "#F472B6",
  beauty: "#F472B6",
  tech: "#4F46E5",
  technologie: "#4F46E5",
  food: "#F59E0B",
  essen: "#F59E0B",
  fitness: "#10B981",
  sport: "#10B981",
  sustainability: "#10B981",
  nachhaltigkeit: "#10B981",
  books: "#4F46E5",
  bücher: "#4F46E5",
  audio: "#F59E0B",
  musik: "#F59E0B",
  reisen: "#6366F1",
  gaming: "#4F46E5",
};

const CATEGORY_EMOJIS: Record<string, string> = {
  fashion: "👗", mode: "👗", beauty: "💄", tech: "💻", technologie: "💻",
  food: "🍝", essen: "🍝", fitness: "🏋", sport: "🏋",
  sustainability: "🌱", nachhaltigkeit: "🌱", books: "📚", bücher: "📚",
  audio: "🎧", musik: "🎧", reisen: "✈️", gaming: "🎮",
};

function getCategoryColor(c: Community): string {
  const cat = (c.category ?? c.name).toLowerCase();
  for (const [key, color] of Object.entries(CATEGORY_COLORS)) {
    if (cat.includes(key)) return color;
  }
  // Fallback based on name hash
  const fallbacks = ["#F59E0B", "#4F46E5", "#10B981", "#F472B6", "#6366F1"];
  let h = 0;
  for (let i = 0; i < c.name.length; i++) h = c.name.charCodeAt(i) + ((h << 5) - h);
  return fallbacks[Math.abs(h) % fallbacks.length];
}

function getCategoryEmoji(c: Community): string {
  const cat = (c.category ?? c.name).toLowerCase();
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJIS)) {
    if (cat.includes(key)) return emoji;
  }
  return "💬";
}

export default function CommunitiesTab() {
  const [mine, setMine] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const { communities } = await communitiesApi.mine();
      setMine(communities);
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(); };

  const filtered = search.trim()
    ? mine.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : mine;

  // Build pairs for 2-column grid
  const pairs: (Community | null)[][] = [];
  for (let i = 0; i < filtered.length; i += 2) {
    pairs.push([filtered[i], filtered[i + 1] ?? null]);
  }

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      {/* Header */}
      <View style={s.headerSection}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.title}>Communities</Text>
            <Text style={s.subtitle}>Tritt bei, entdecke, teile.</Text>
          </View>
          <Pressable style={s.addBtn} onPress={() => router.push("/create-community")} hitSlop={10}>
            <Plus color="#FFFFFF" size={20} strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* Search */}
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
          data={pairs}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={{ fontSize: 48, marginBottom: 14 }}>👥</Text>
              <Text style={s.emptyTitle}>Noch in keiner Community</Text>
              <Text style={s.emptyText}>Erstelle deine eigene oder entdecke bestehende.</Text>
              <Pressable style={s.emptyBtn} onPress={() => router.push("/create-community")}>
                <Text style={s.emptyBtnText}>Community erstellen</Text>
              </Pressable>
              <Pressable style={s.emptyBtnSecondary} onPress={() => router.push("/discover")}>
                <Text style={s.emptyBtnSecondaryText}>Entdecken</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item: pair }) => (
            <View style={s.row}>
              {pair.map((c, i) =>
                c ? <CommunityCard key={c.id} community={c} /> : <View key={`empty-${i}`} style={{ width: CARD_W }} />
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function CommunityCard({ community: c }: { community: Community }) {
  const accent = getCategoryColor(c);
  const emoji = getCategoryEmoji(c);
  const isMember = c.is_member || c.my_role === "owner" || c.role === "owner";

  return (
    <Pressable style={s.card} onPress={() => router.push(`/community/${c.id}`)}>
      {/* Colored overlay */}
      <View style={[s.cardOverlay, { backgroundColor: accent + "14" }]} />

      {/* Emoji icon */}
      <View style={[s.emojiBox, { backgroundColor: accent + "30" }]}>
        <Text style={s.emoji}>{c.image_url ? "" : emoji}</Text>
        {c.image_url && <Image source={{ uri: c.image_url }} style={s.emojiImg} />}
      </View>

      {/* Name */}
      <Text style={s.cardName} numberOfLines={1}>{c.name}</Text>

      {/* Member count */}
      <Text style={s.cardMeta}>{c.member_count.toLocaleString("de-DE")} Mitglieder</Text>

      {/* Join / Beigetreten */}
      {isMember ? (
        <View style={[s.joinBtn, s.joinedBtn, { borderColor: accent }]}>
          <Text style={[s.joinBtnText, { color: accent }]}>Beigetreten</Text>
        </View>
      ) : (
        <View style={[s.joinBtn, { backgroundColor: accent }]}>
          <Text style={[s.joinBtnText, { color: accent === "#F59E0B" ? "#1A1D2E" : "#FFFFFF" }]}>Join</Text>
        </View>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0E1A" },

  // Header
  headerSection: { paddingHorizontal: 16, paddingBottom: 8 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingTop: 6, paddingBottom: 10 },
  title: { color: "#FFFFFF", fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { color: "#94A3B8", fontSize: 14, marginTop: 2 },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#141926", justifyContent: "center", alignItems: "center" },

  // Search
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#141926", borderRadius: 24, paddingHorizontal: 16, height: 48, gap: 10, marginBottom: 4 },
  searchInput: { flex: 1, color: "#FFFFFF", fontSize: 15, height: 48 },

  // Grid
  row: { flexDirection: "row", gap: CARD_GAP, marginBottom: CARD_GAP },
  card: {
    width: CARD_W,
    backgroundColor: "#141926",
    borderRadius: 20,
    padding: 16,
    overflow: "hidden",
    minHeight: 160,
  },
  cardOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: 20 },
  emojiBox: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center", marginBottom: 12, overflow: "hidden" },
  emoji: { fontSize: 26 },
  emojiImg: { width: 48, height: 48, borderRadius: 14, position: "absolute" },
  cardName: { color: "#FFFFFF", fontSize: 17, fontWeight: "800", marginBottom: 4 },
  cardMeta: { color: "#94A3B8", fontSize: 12, marginBottom: 10 },

  // Join button
  joinBtn: { alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 7, borderRadius: 14, minHeight: 32, justifyContent: "center" },
  joinedBtn: { backgroundColor: "transparent", borderWidth: 1.5 },
  joinBtnText: { fontSize: 13, fontWeight: "700" },

  // Empty
  empty: { padding: 40, alignItems: "center", marginTop: 40 },
  emptyTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "700", marginBottom: 6 },
  emptyText: { color: "#64748B", fontSize: 14, textAlign: "center", marginBottom: 18 },
  emptyBtn: { backgroundColor: colors.accent, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14, marginBottom: 8 },
  emptyBtnText: { color: "#1A1D2E", fontWeight: "700" },
  emptyBtnSecondary: { backgroundColor: "#141926", paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14 },
  emptyBtnSecondaryText: { color: "#FFFFFF", fontWeight: "700" },
});
