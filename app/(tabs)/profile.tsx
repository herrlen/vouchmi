import { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Image, Pressable, Dimensions, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Settings as SettingsIcon, Grid3x3, LinkIcon } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { colors } from "../../src/constants/theme";
import { useAuth } from "../../src/lib/store";
import { profile as profileApi, feed as feedApi, type Post } from "../../src/lib/api";

const { width } = Dimensions.get("window");
const NUM_COLS = 3;
const GAP = 2;
const TILE = (width - GAP * (NUM_COLS - 1)) / NUM_COLS;

type ProfileData = {
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  link: string | null;
};

export default function ProfileTab() {
  const me = useAuth((s) => s.user);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState({ communities_count: 0, posts_count: 0 });
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [pRes, postsRes] = await Promise.all([
        profileApi.get(),
        feedApi.mine(),
      ]);
      setProfile(pRes.profile);
      setStats(pRes.stats);
      setMyPosts(postsRes.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const displayName = profile?.display_name ?? me?.username ?? "";
  const initial = displayName[0]?.toUpperCase() ?? "?";

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.title}>Profil</Text>
        <Pressable style={s.iconBtn} onPress={() => router.push("/settings")} hitSlop={10}>
          <SettingsIcon color={colors.white} size={22} />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={myPosts}
          keyExtractor={(p) => p.id}
          numColumns={NUM_COLS}
          columnWrapperStyle={{ gap: GAP }}
          ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          ListHeaderComponent={
            <View style={s.headerContent}>
              <View style={s.topRow}>
                <Pressable onPress={() => router.push("/profile-edit")}>
                  {profile?.avatar_url ? (
                    <Image source={{ uri: profile.avatar_url }} style={s.avatar} />
                  ) : (
                    <View style={[s.avatar, s.avatarPlaceholder]}>
                      <Text style={s.avatarInitial}>{initial}</Text>
                    </View>
                  )}
                </Pressable>
                <View style={s.stats}>
                  <Stat label="Posts" value={stats.posts_count} />
                  <Stat label="Communities" value={stats.communities_count} />
                </View>
              </View>

              <Text style={s.name}>{displayName}</Text>
              <Text style={s.handle}>@{me?.username}</Text>
              {!!profile?.bio && <Text style={s.bio}>{profile.bio}</Text>}
              {!!profile?.link && (
                <Pressable style={s.linkRow}>
                  <LinkIcon color={colors.accent} size={13} />
                  <Text style={s.link} numberOfLines={1}>{profile.link}</Text>
                </Pressable>
              )}

              <View style={s.ctaRow}>
                <Pressable style={s.editBtn} onPress={() => router.push("/profile-edit")}>
                  <Text style={s.editText}>Profil bearbeiten</Text>
                </Pressable>
                <Pressable style={s.shareBtn} onPress={() => router.push("/settings")}>
                  <Text style={s.shareText}>Einstellungen</Text>
                </Pressable>
              </View>

              <View style={s.gridHeader}>
                <Grid3x3 color={colors.white} size={18} />
                <Text style={s.gridLabel}>Meine Posts</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyTitle}>Noch keine Posts</Text>
              <Text style={s.emptyText}>Teile dein erstes Produkt.</Text>
              <Pressable style={s.emptyBtn} onPress={() => router.push("/create-post")}>
                <Text style={s.emptyBtnText}>Produkt teilen</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={s.tile} onPress={() => router.push(`/post/${item.id}`)}>
              {item.link_image ? (
                <Image source={{ uri: item.link_image }} style={s.tileImg} />
              ) : (
                <View style={[s.tileImg, s.tileEmpty]}>
                  <Text style={s.tileEmptyText}>🛒</Text>
                </View>
              )}
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  title: { color: colors.white, fontSize: 26, fontWeight: "700" },
  iconBtn: { minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "flex-end" },
  headerContent: { paddingHorizontal: 16, paddingBottom: 10 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  avatar: { width: 86, height: 86, borderRadius: 43 },
  avatarPlaceholder: { backgroundColor: colors.accent, justifyContent: "center", alignItems: "center" },
  avatarInitial: { color: colors.bg, fontSize: 38, fontWeight: "800" },
  stats: { flex: 1, flexDirection: "row", justifyContent: "space-around" },
  stat: { alignItems: "center" },
  statValue: { color: colors.white, fontSize: 20, fontWeight: "700" },
  statLabel: { color: colors.gray, fontSize: 12, marginTop: 2 },
  name: { color: colors.white, fontSize: 16, fontWeight: "700", marginTop: 12 },
  handle: { color: colors.gray, fontSize: 13, marginTop: 1 },
  bio: { color: colors.white, fontSize: 13, lineHeight: 18, marginTop: 6 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  link: { color: colors.accent, fontSize: 13, flex: 1 },
  ctaRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  editBtn: { flex: 1, backgroundColor: colors.bgInput, paddingVertical: 10, borderRadius: 8, alignItems: "center", minHeight: 44, justifyContent: "center" },
  editText: { color: colors.white, fontSize: 14, fontWeight: "600" },
  shareBtn: { flex: 1, backgroundColor: colors.bgInput, paddingVertical: 10, borderRadius: 8, alignItems: "center", minHeight: 44, justifyContent: "center" },
  shareText: { color: colors.white, fontSize: 14, fontWeight: "600" },
  gridHeader: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center", paddingTop: 18, paddingBottom: 10, borderTopWidth: 0.5, borderTopColor: colors.border, marginTop: 16, marginHorizontal: -16 },
  gridLabel: { color: colors.white, fontSize: 13, fontWeight: "600" },
  tile: { width: TILE, height: TILE },
  tileImg: { width: "100%", height: "100%" },
  tileEmpty: { backgroundColor: colors.bgCard, justifyContent: "center", alignItems: "center" },
  tileEmptyText: { fontSize: 28 },
  empty: { padding: 40, alignItems: "center", marginTop: 20 },
  emptyTitle: { color: colors.white, fontSize: 16, fontWeight: "700", marginBottom: 4 },
  emptyText: { color: colors.gray, fontSize: 13, marginBottom: 14 },
  emptyBtn: { backgroundColor: colors.accent, paddingHorizontal: 22, paddingVertical: 11, borderRadius: 10 },
  emptyBtnText: { color: colors.bg, fontWeight: "700" },
});
