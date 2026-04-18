import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import type { Community } from "../lib/api";

type Props = {
  communities: Community[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const CATEGORY_EMOJIS: Record<string, string> = {
  fashion: "👗", mode: "👗", beauty: "💄", tech: "💻", technologie: "💻",
  food: "🍝", essen: "🍝", fitness: "🏋", sport: "🏋",
  sustainability: "🌱", nachhaltigkeit: "🌱", books: "📚", bücher: "📚",
  audio: "🎧", musik: "🎧", reisen: "✈️", gaming: "🎮",
};

function getEmoji(c: Community): string {
  const cat = (c.category ?? c.name).toLowerCase();
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJIS)) {
    if (cat.includes(key)) return emoji;
  }
  return "💬";
}

export default function CommunityPicker({ communities, isLoading, selectedId, onSelect }: Props) {
  if (isLoading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color="#F59E0B" />
        <Text style={s.loadingText}>Lade deine Communities…</Text>
      </View>
    );
  }

  if (communities.length === 0) {
    return (
      <View style={s.empty}>
        <Text style={{ fontSize: 32 }}>👥</Text>
        <Text style={s.emptyTitle}>Noch keine Community</Text>
        <Text style={s.emptyText}>Tritt einer Community bei, um Empfehlungen zu teilen.</Text>
      </View>
    );
  }

  return (
    <View style={s.list} accessibilityRole="radiogroup">
      {communities.map((c) => {
        const isSelected = c.id === selectedId;
        return (
          <Pressable
            key={c.id}
            onPress={() => onSelect(c.id)}
            style={[s.item, isSelected && s.itemSelected]}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`Community ${c.name}, ${c.member_count} Mitglieder`}
          >
            <View style={s.iconWrap}>
              <Text style={s.iconEmoji}>{getEmoji(c)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.name, isSelected && { color: "#FFFFFF" }]} numberOfLines={1}>{c.name}</Text>
              <Text style={s.sub}>{c.member_count} Mitglieder</Text>
            </View>
            <View style={[s.radio, isSelected && s.radioSelected]}>
              {isSelected && <Check color="#1A1D2E" size={14} strokeWidth={3} />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  list: { gap: 8 },
  item: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 16, backgroundColor: "#141926",
    borderWidth: 1.5, borderColor: "transparent", minHeight: 64,
  },
  itemSelected: { borderColor: "#F59E0B", backgroundColor: "#1A1D2E" },
  iconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#F59E0B18", alignItems: "center", justifyContent: "center" },
  iconEmoji: { fontSize: 22 },
  name: { color: "#94A3B8", fontSize: 15, fontWeight: "600" },
  sub: { color: "#64748B", fontSize: 12, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: "#4A5068", alignItems: "center", justifyContent: "center" },
  radioSelected: { backgroundColor: "#F59E0B", borderColor: "#F59E0B" },
  loading: { padding: 32, alignItems: "center", gap: 12 },
  loadingText: { color: "#94A3B8", fontSize: 13 },
  empty: { padding: 32, alignItems: "center", gap: 8, backgroundColor: "#141926", borderRadius: 16 },
  emptyTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  emptyText: { color: "#94A3B8", fontSize: 13, textAlign: "center", lineHeight: 18 },
});
