import { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Image, Pressable, Dimensions, ActivityIndicator, RefreshControl, Share, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Menu, Compass, Repeat2, Bookmark as BookmarkIcon, Link as LinkIcon2 } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { colors } from "../../src/constants/theme";
import { useAuth } from "../../src/lib/store";
import { useScrollStore } from "../../src/lib/scroll-store";
import { profile as profileApi, feed as feedApi, type Post } from "../../src/lib/api";

const { width } = Dimensions.get("window");
const NUM_COLS = 3;
const GAP = 2;
const TILE = (width - GAP * (NUM_COLS - 1)) / NUM_COLS;

type SubTab = "reco" | "shared" | "saved";

export default function ProfileTab() {
  const me = useAuth((s) => s.user);
  const [profileData, setProfileData] = useState<any>(null);
  const [stats, setStats] = useState({ communities_count: 0, posts_count: 0, followers_count: 0, following_count: 0 });
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [myReposts, setMyReposts] = useState<Post[]>([]);
  const [myBookmarks, setMyBookmarks] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>("reco");

  const load = useCallback(async () => {
    try {
      const [pRes, postsRes, repostsRes, bookmarksRes] = await Promise.all([
        profileApi.get(),
        feedApi.mine(),
        feedApi.myReposts(),
        feedApi.bookmarks(),
      ]);
      setProfileData(pRes.profile);
      setStats(pRes.stats);
      setMyPosts(postsRes.data);
      setMyReposts(repostsRes.data);
      setMyBookmarks(bookmarksRes.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(); };

  const displayName = profileData?.display_name ?? me?.username ?? "";
  const initial = displayName[0]?.toUpperCase() ?? "?";

  const currentData = subTab === "reco" ? myPosts : subTab === "shared" ? myReposts : myBookmarks;

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />
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
            <View>
              {/* Compact Header: Avatar + Stats + Menu */}
              <View style={s.topBar}>
                <Pressable onPress={() => router.push("/profile-edit")}>
                  {profileData?.avatar_url ? (
                    <Image source={{ uri: profileData.avatar_url }} style={s.avatar} />
                  ) : (
                    <View style={[s.avatar, s.avatarFallback]}>
                      <Text style={s.avatarInitial}>{initial}</Text>
                    </View>
                  )}
                </Pressable>

                <View style={s.statsRow}>
                  <Stat label="Posts" value={stats.posts_count} />
                  <Stat label="Follower" value={stats.followers_count} />
                  <Stat label="Folge ich" value={stats.following_count} />
                </View>

                <Pressable style={s.menuBtn} onPress={() => router.push("/settings")} hitSlop={10}>
                  <Menu color={colors.white} size={22} strokeWidth={1.8} />
                </Pressable>
              </View>

              {/* Name + Bio */}
              <View style={s.info}>
                <Text style={s.name}>{displayName}</Text>
                <Text style={s.handle}>@{me?.username}</Text>
                {!!profileData?.bio && <Text style={s.bio}>{profileData.bio}</Text>}
                {!!profileData?.link && (
                  <Pressable style={s.linkRow} onPress={() => profileData.link && Linking.openURL(profileData.link)}>
                    <LinkIcon2 color={colors.accent} size={12} />
                    <Text style={s.link} numberOfLines={1}>{profileData.link}</Text>
                  </Pressable>
                )}
              </View>

              {/* CTA Buttons */}
              <View style={s.ctaRow}>
                <Pressable style={s.ctaBtn} onPress={() => router.push("/profile-edit")}>
                  <Text style={s.ctaText}>Profil bearbeiten</Text>
                </Pressable>
                <Pressable style={s.ctaBtn} onPress={async () => {
                  try { await Share.share({ message: `Schau dir mein Profil auf Vouchmi an:\nhttps://vouchmi.com/@${me?.username}` }); } catch {}
                }}>
                  <Text style={s.ctaText}>Teilen</Text>
                </Pressable>
              </View>

              {/* Sub Tabs: Reco | Geteilt | Gespeichert */}
              <View style={s.subTabs}>
                <Pressable style={[s.subTab, subTab === "reco" && s.subTabOn]} onPress={() => setSubTab("reco")}>
                  <Compass color={subTab === "reco" ? colors.white : colors.gray} size={18} strokeWidth={1.8} />
                  <Text style={[s.subTabText, subTab === "reco" && s.subTabTextOn]}>Reco</Text>
                </Pressable>
                <Pressable style={[s.subTab, subTab === "shared" && s.subTabOn]} onPress={() => setSubTab("shared")}>
                  <Repeat2 color={subTab === "shared" ? colors.white : colors.gray} size={18} strokeWidth={1.8} />
                  <Text style={[s.subTabText, subTab === "shared" && s.subTabTextOn]}>Geteilt</Text>
                </Pressable>
                <Pressable style={[s.subTab, subTab === "saved" && s.subTabOn]} onPress={() => setSubTab("saved")}>
                  <BookmarkIcon color={subTab === "saved" ? colors.white : colors.gray} size={18} strokeWidth={1.8} />
                  <Text style={[s.subTabText, subTab === "saved" && s.subTabTextOn]}>Gespeichert</Text>
                </Pressable>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyText}>
                {subTab === "reco" ? "Noch keine eigenen Recos" : subTab === "shared" ? "Noch nichts geteilt" : "Noch nichts gespeichert"}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={s.tile} onPress={() => {
              useScrollStore.getState().setScrollToPostId(item.id);
              router.replace("/reco");
            }}>
              {item.link_image ? (
                <Image source={{ uri: item.link_image }} style={s.tileImg} />
              ) : (
                <View style={[s.tileImg, s.tileEmpty]}>
                  <Text style={s.tileEmoji}>🔗</Text>
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

  // Compact top bar
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 8, paddingBottom: 4, gap: 12 },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  avatarFallback: { backgroundColor: colors.accent, justifyContent: "center", alignItems: "center" },
  avatarInitial: { color: "#fff", fontSize: 30, fontWeight: "800" },
  statsRow: { flex: 1, flexDirection: "row", justifyContent: "space-around" },
  stat: { alignItems: "center" },
  statValue: { color: colors.white, fontSize: 18, fontWeight: "700" },
  statLabel: { color: colors.gray, fontSize: 11, marginTop: 1 },
  menuBtn: { minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "center" },

  // Info
  info: { paddingHorizontal: 16, paddingTop: 6 },
  name: { color: colors.white, fontSize: 15, fontWeight: "700" },
  handle: { color: colors.gray, fontSize: 12, marginTop: 1 },
  bio: { color: colors.white, fontSize: 13, lineHeight: 17, marginTop: 4 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  link: { color: colors.accent, fontSize: 12, flex: 1 },

  // CTA
  ctaRow: { flexDirection: "row", gap: 6, paddingHorizontal: 14, marginTop: 10 },
  ctaBtn: { flex: 1, backgroundColor: colors.bgInput, paddingVertical: 8, borderRadius: 8, alignItems: "center", minHeight: 36, justifyContent: "center" },
  ctaText: { color: colors.white, fontSize: 13, fontWeight: "600" },

  // Sub tabs
  subTabs: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: colors.border, marginTop: 12, marginHorizontal: 0 },
  subTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
  subTabOn: { borderBottomColor: colors.white },
  subTabText: { color: colors.gray, fontSize: 12, fontWeight: "600" },
  subTabTextOn: { color: colors.white },

  // Empty
  empty: { padding: 40, alignItems: "center" },
  emptyText: { color: colors.gray, fontSize: 14 },

  // Grid
  tile: { width: TILE, height: TILE },
  tileImg: { width: "100%", height: "100%" },
  tileEmpty: { backgroundColor: colors.bgCard, justifyContent: "center", alignItems: "center" },
  tileEmoji: { fontSize: 24 },
});
