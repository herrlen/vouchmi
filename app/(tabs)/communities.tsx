import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator, Alert, Image, Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, Send } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { colors } from "../../src/constants/theme";
import { useAuth } from "../../src/lib/store";
import { communities as communitiesApi, type Community } from "../../src/lib/api";

export default function CommunitiesTab() {
  const me = useAuth((s) => s.user);
  const [mine, setMine] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const toggleFollow = async (c: Community) => {
    try {
      if (c.is_followed) {
        const { follower_count } = await communitiesApi.unfollow(c.id);
        setMine((arr) => arr.map((x) => x.id === c.id ? { ...x, is_followed: false, follower_count } : x));
      } else {
        const { follower_count } = await communitiesApi.follow(c.id);
        setMine((arr) => arr.map((x) => x.id === c.id ? { ...x, is_followed: true, follower_count } : x));
      }
    } catch (e: any) { Alert.alert("Fehler", e.message); }
  };

  const shareCommunity = async (c: Community) => {
    try {
      const { invite_link } = await communitiesApi.invite(c.id);
      await Share.share({ message: `Tritt der Community "${c.name}" auf Vouchmi bei:\n${invite_link}` });
    } catch (e: any) { Alert.alert("Fehler", e.message); }
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.title}>Communities</Text>
        <Pressable style={s.addBtn} onPress={() => router.push("/create-community")} hitSlop={10}>
          <Plus color={colors.accent} size={24} />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={mine}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>👥</Text>
              <Text style={s.emptyTitle}>Noch in keiner Community</Text>
              <Text style={s.emptyText}>Erstelle deine eigene oder entdecke bestehende.</Text>
              <Pressable style={s.emptyBtn} onPress={() => router.push("/create-community")}>
                <Text style={s.emptyBtnText}>Community erstellen</Text>
              </Pressable>
              <Pressable style={[s.emptyBtn, s.emptyBtnSecondary]} onPress={() => router.push("/discover")}>
                <Text style={[s.emptyBtnText, { color: colors.white }]}>Entdecken</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => {
            const isOwn = item.role === "owner" || item.my_role === "owner";
            return (
              <View style={s.card}>
                <Pressable style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 12 }} onPress={() => router.push(`/community/${item.id}`)}>
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={s.image} />
                  ) : (
                    <View style={[s.image, { backgroundColor: stringColor(item.name) }]}>
                      <Text style={s.imageInitial}>{item.name[0]?.toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={s.name} numberOfLines={1}>{item.name}</Text>
                    {item.description && <Text style={s.desc} numberOfLines={2}>{item.description}</Text>}
                    <Text style={s.meta}>
                      {item.member_count} {item.member_count === 1 ? "Mitglied" : "Mitglieder"}
                      {item.category ? ` · ${item.category}` : ""}
                      {isOwn ? " · Owner" : ""}
                    </Text>
                  </View>
                </Pressable>
                {!isOwn && (
                  <View style={s.actions}>
                    <Pressable style={s.iconBtn} onPress={() => shareCommunity(item)} hitSlop={6}>
                      <Send color={colors.white} size={18} strokeWidth={1.8} />
                    </Pressable>
                    <Pressable
                      style={[s.followBtn, item.is_followed && s.followBtnActive]}
                      onPress={() => toggleFollow(item)}
                      hitSlop={6}
                    >
                      <Text style={[s.followBtnText, item.is_followed && s.followBtnTextActive]}>
                        {item.is_followed ? "Folgt" : "Folgen"}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

function stringColor(s: string) {
  const c = ["#F59E0B", "#FBBF24", "#4F46E5", "#10B981", "#F472B6"];
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return c[Math.abs(h) % c.length];
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  title: { color: colors.white, fontSize: 26, fontWeight: "700" },
  addBtn: { minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "flex-end" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  image: { width: 56, height: 56, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  imageInitial: { color: "#fff", fontWeight: "800", fontSize: 24 },
  name: { color: colors.white, fontSize: 16, fontWeight: "600" },
  desc: { color: colors.gray, fontSize: 13, lineHeight: 17 },
  meta: { color: colors.grayDark, fontSize: 11 },
  empty: { padding: 40, alignItems: "center", marginTop: 40 },
  emptyEmoji: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { color: colors.white, fontSize: 18, fontWeight: "700", marginBottom: 6 },
  emptyText: { color: colors.gray, fontSize: 14, textAlign: "center", marginBottom: 18 },
  emptyBtn: { backgroundColor: colors.accent, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 10, marginBottom: 8 },
  emptyBtnSecondary: { backgroundColor: colors.bgCard },
  emptyBtnText: { color: "#fff", fontWeight: "700" },
  actions: { flexDirection: "row", alignItems: "center", gap: 6 },
  iconBtn: { width: 36, height: 32, justifyContent: "center", alignItems: "center" },
  followBtn: { backgroundColor: colors.accent, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, minHeight: 32, justifyContent: "center" },
  followBtnActive: { backgroundColor: colors.bgInput },
  followBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  followBtnTextActive: { color: colors.white },
});
