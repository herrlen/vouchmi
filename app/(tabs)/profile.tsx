import { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Image, Pressable, Dimensions, ActivityIndicator, RefreshControl, Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Settings as SettingsIcon, Link as LinkIcon2, Film } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { colors } from "../../src/constants/theme";
import { useAuth } from "../../src/lib/store";
import { profile as profileApi, feed as feedApi, type Post } from "../../src/lib/api";

const { width } = Dimensions.get("window");
const NUM_COLS = 3;
const GAP = 2;
const TILE = (width - GAP * (NUM_COLS - 1)) / NUM_COLS;

type SubTab = "links" | "stories";

export default function ProfileTab() {
  const me = useAuth((s) => s.user);
  const [profileData, setProfileData] = useState<any>(null);
  const [stats, setStats] = useState({ communities_count: 0, posts_count: 0 });
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>("links");

  const load = useCallback(async () => {
    try {
      const [pRes, postsRes] = await Promise.all([profileApi.get(), feedApi.mine()]);
      setProfileData(pRes.profile);
      setStats(pRes.stats);
      setMyPosts(postsRes.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(); };

  const displayName = profileData?.display_name ?? me?.username ?? "";
  const initial = displayName[0]?.toUpperCase() ?? "?";

  const linkPosts = myPosts.filter((p) => p.post_type === "link" || p.link_url);
  const storyPosts = myPosts.filter((p) => p.post_type === "story");
  const currentData = subTab === "links" ? linkPosts : storyPosts;

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
          data={currentData}
          keyExtractor={(p) => p.id}
          numColumns={NUM_COLS}
          columnWrapperStyle={currentData.length > 0 ? { gap: GAP } : undefined}
          ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          ListHeaderComponent={
            <View style={s.headerContent}>
              <View style={s.topRow}>
                <Pressable onPress={() => router.push("/profile-edit")}>
                  {profileData?.avatar_url ? (
                    <Image source={{ uri: profileData.avatar_url }} style={s.avatar} />
                  ) : (
                    <View style={[s.avatar, s.avatarPlaceholder]}>
                      <Text style={s.avatarInitial}>{initial}</Text>
                    </View>
                  )}
                </Pressable>
                <View style={s.statsRow}>
                  <Stat label="Posts" value={stats.posts_count} />
                  <Stat label="Follower" value={stats.followers_count ?? 0} />
                  <Stat label="Folge ich" value={stats.following_count ?? 0} />
                </View>
              </View>

              <Text style={s.name}>{displayName}</Text>
              <Text style={s.handle}>@{me?.username}</Text>
              {!!profileData?.bio && <Text style={s.bio}>{profileData.bio}</Text>}
              {!!profileData?.link && (
                <View style={s.linkRow}>
                  <LinkIcon2 color={colors.accent} size={13} />
                  <Text style={s.link} numberOfLines={1}>{profileData.link}</Text>
                </View>
              )}

              <View style={s.ctaRow}>
                <Pressable style={s.editBtn} onPress={() => router.push("/profile-edit")}>
                  <Text style={s.editText}>Profil bearbeiten</Text>
                </Pressable>
                <Pressable style={s.shareBtn} onPress={async () => {
                  try {
                    await Share.share({ message: `Schau dir mein Profil auf TrusCart an:\nhttps://truscart.com/@${me?.username}` });
                  } catch {}
                }}>
                  <Text style={s.shareText}>Teilen</Text>
                </Pressable>
              </View>

              <View style={s.subTabs}>
                <Pressable style={[s.subTab, subTab === "links" && s.subTabOn]} onPress={() => setSubTab("links")}>
                  <LinkIcon2 color={subTab === "links" ? colors.white : colors.gray} size={18} />
                  <Text style={[s.subTabText, subTab === "links" && s.subTabTextOn]}>Links</Text>
                </Pressable>
                <Pressable style={[s.subTab, subTab === "stories" && s.subTabOn]} onPress={() => setSubTab("stories")}>
                  <Film color={subTab === "stories" ? colors.white : colors.gray} size={18} />
                  <Text style={[s.subTabText, subTab === "stories" && s.subTabTextOn]}>Stories</Text>
                </Pressable>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyText}>{subTab === "links" ? "Noch keine Link-Posts" : "Noch keine Stories"}</Text>
              <Pressable style={s.emptyBtn} onPress={() => router.push(subTab === "links" ? "/create-post" : "/create-story")}>
                <Text style={s.emptyBtnText}>{subTab === "links" ? "Link teilen" : "Story erstellen"}</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={s.tile} onPress={() => router.push(`/post/${item.id}`)}>
              {item.link_image ? (
                <Image source={{ uri: item.link_image }} style={s.tileImg} />
              ) : (
                <View style={[s.tileImg, s.tileEmpty]}>
                  <Text style={s.tileEmoji}>{subTab === "links" ? "🔗" : "📸"}</Text>
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
  headerContent: { paddingHorizontal: 16, paddingBottom: 4 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  avatar: { width: 86, height: 86, borderRadius: 43 },
  avatarPlaceholder: { backgroundColor: colors.accent, justifyContent: "center", alignItems: "center" },
  avatarInitial: { color: colors.bg, fontSize: 38, fontWeight: "800" },
  statsRow: { flex: 1, flexDirection: "row", justifyContent: "space-around" },
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
  subTabs: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: colors.border, marginTop: 16, marginHorizontal: -16 },
  subTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: "transparent" },
  subTabOn: { borderBottomColor: colors.white },
  subTabText: { color: colors.gray, fontSize: 13, fontWeight: "600" },
  subTabTextOn: { color: colors.white },
  empty: { padding: 40, alignItems: "center", marginTop: 20 },
  emptyText: { color: colors.gray, fontSize: 14, marginBottom: 14 },
  emptyBtn: { backgroundColor: colors.accent, paddingHorizontal: 22, paddingVertical: 11, borderRadius: 10 },
  emptyBtnText: { color: colors.bg, fontWeight: "700" },
  tile: { width: TILE, height: TILE },
  tileImg: { width: "100%", height: "100%" },
  tileEmpty: { backgroundColor: colors.bgCard, justifyContent: "center", alignItems: "center" },
  tileEmoji: { fontSize: 28 },
});
