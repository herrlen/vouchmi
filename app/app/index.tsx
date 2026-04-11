// app/index.tsx
import { useEffect } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter, Redirect } from "expo-router";
import { useAuth, useApp } from "../src/lib/store";
import { colors } from "../src/constants/theme";

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const { communities, loadCommunities } = useApp();
  const router = useRouter();

  useEffect(() => { if (user) loadCommunities(); }, [user]);

  if (authLoading) return <View style={s.center}><Text style={s.logo}>TrusCart</Text><ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} /></View>;
  if (!user) return <Redirect href="/auth" />;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.logo}>TrusCart</Text>
        <View style={s.headerBtns}>
          <Pressable style={s.discoverBtn} onPress={() => router.push("/discover")}>
            <Text style={s.discoverBtnText}>🔍</Text>
          </Pressable>
          <Pressable style={s.createBtn} onPress={() => router.push("/create-community")}>
            <Text style={s.createBtnText}>+</Text>
          </Pressable>
        </View>
      </View>

      {/* Community List */}
      <FlatList
        data={communities}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        onRefresh={loadCommunities}
        refreshing={false}
        renderItem={({ item }) => (
          <Pressable style={s.card} onPress={() => router.push(`/community/${item.id}`)}>
            <View style={[s.avatar, { backgroundColor: stringColor(item.name) }]}>
              <Text style={s.avatarText}>{item.name[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>{item.name}</Text>
              <Text style={s.cardSub}>{item.member_count} Mitglieder{item.category ? ` · ${item.category}` : ""}</Text>
            </View>
            {item.role === "owner" && (
              <View style={s.badge}><Text style={s.badgeText}>Owner</Text></View>
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>👋</Text>
            <Text style={s.emptyTitle}>Willkommen bei TrusCart</Text>
            <Text style={s.emptyText}>Erstelle deine erste Community oder entdecke bestehende.</Text>
            <Pressable style={s.emptyBtn} onPress={() => router.push("/create-community")}>
              <Text style={s.emptyBtnText}>Community erstellen</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

function stringColor(s: string) {
  const c = ["#00D4AA", "#6366F1", "#EC4899", "#F59E0B", "#8B5CF6"];
  let h = 0; for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return c[Math.abs(h) % c.length];
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  logo: { color: colors.accent, fontSize: 28, fontWeight: "900", letterSpacing: -0.5 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12 },
  headerBtns: { flexDirection: "row", gap: 10 },
  discoverBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgCard, justifyContent: "center", alignItems: "center" },
  discoverBtnText: { fontSize: 18 },
  createBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, justifyContent: "center", alignItems: "center" },
  createBtnText: { color: colors.bg, fontSize: 22, fontWeight: "bold" },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bgCard, borderRadius: 14, padding: 14, marginBottom: 10, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#FFF", fontSize: 20, fontWeight: "bold" },
  cardTitle: { color: colors.white, fontSize: 16, fontWeight: "600" },
  cardSub: { color: colors.gray, fontSize: 13, marginTop: 2 },
  badge: { backgroundColor: colors.accentDim, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { color: colors.accent, fontSize: 11, fontWeight: "600" },
  empty: { alignItems: "center", paddingTop: 80 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { color: colors.white, fontSize: 20, fontWeight: "bold", marginTop: 16 },
  emptyText: { color: colors.gray, marginTop: 8, textAlign: "center", paddingHorizontal: 40, lineHeight: 20 },
  emptyBtn: { backgroundColor: colors.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, marginTop: 24 },
  emptyBtnText: { color: colors.bg, fontWeight: "bold", fontSize: 15 },
});
