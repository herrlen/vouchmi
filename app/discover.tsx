// app/discover.tsx
import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import * as api from "../src/lib/api";
import { useApp } from "../src/lib/store";
import { colors } from "../src/constants/theme";

export default function Discover() {
  const [communities, setCommunities] = useState<api.Community[]>([]);
  const [joining, setJoining] = useState<string | null>(null);
  const router = useRouter();
  const loadMine = useApp((s) => s.loadCommunities);

  useEffect(() => {
    api.communities.discover().then((r) => setCommunities(r.communities)).catch(() => {});
  }, []);

  const handleJoin = async (id: string) => {
    setJoining(id);
    try {
      await api.communities.join(id);
      await loadMine();
      router.replace(`/community/${id}`);
    } catch {} finally { setJoining(null); }
  };

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      data={communities}
      keyExtractor={(i) => i.id}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => (
        <View style={s.card}>
          <View style={[s.avatar, { backgroundColor: stringColor(item.name) }]}>
            <Text style={s.avatarText}>{item.name[0]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{item.name}</Text>
            <Text style={s.sub}>{item.member_count} Mitglieder{item.category ? ` · ${item.category}` : ""}</Text>
            {item.description && <Text style={s.desc} numberOfLines={2}>{item.description}</Text>}
          </View>
          <Pressable style={[s.joinBtn, joining === item.id && { opacity: 0.5 }]}
            onPress={() => handleJoin(item.id)} disabled={joining === item.id}>
            <Text style={s.joinText}>Beitreten</Text>
          </Pressable>
        </View>
      )}
      ListEmptyComponent={<Text style={s.empty}>Noch keine öffentlichen Communities.</Text>}
    />
  );
}

function stringColor(s: string) {
  const c = ["#00D4AA", "#6366F1", "#EC4899", "#F59E0B", "#8B5CF6"];
  let h = 0; for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return c[Math.abs(h) % c.length];
}

const s = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bgCard, borderRadius: 14, padding: 14, marginBottom: 10, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#FFF", fontSize: 20, fontWeight: "bold" },
  name: { color: colors.white, fontSize: 16, fontWeight: "600" },
  sub: { color: colors.gray, fontSize: 13, marginTop: 2 },
  desc: { color: colors.grayDark, fontSize: 12, marginTop: 4, lineHeight: 16 },
  joinBtn: { backgroundColor: colors.accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  joinText: { color: colors.bg, fontWeight: "bold", fontSize: 13 },
  empty: { color: colors.gray, textAlign: "center", marginTop: 40 },
});
