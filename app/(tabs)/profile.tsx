import { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, ScrollView, Image, Pressable, Dimensions, ActivityIndicator, RefreshControl, Share, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Settings, Compass, Repeat2, Bookmark as BookmarkIcon, Link as LinkIcon2, Store, User as UserIcon, Share2, Shield } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { colors } from "../../src/constants/theme";
import { useAuth } from "../../src/lib/store";
import { useProfileMode } from "../../src/lib/profile-mode";
import { useScrollStore } from "../../src/lib/scroll-store";
import { profile as profileApi, feed as feedApi, type Post, type ProfileLayout } from "../../src/lib/api";
import { useTierStore } from "../../src/lib/tier-store";
import VSeal from "../../src/components/VSeal";
import CreatorBadge from "../../src/components/CreatorBadge";
import TierProgressBar from "../../src/components/TierProgressBar";
import MasonryGallery from "../../src/components/gallery/MasonryGallery";
import FeaturedGallery from "../../src/components/gallery/FeaturedGallery";

const { width } = Dimensions.get("window");
const NUM_COLS = 3;
const GAP = 2;
const TILE = (width - GAP * (NUM_COLS - 1)) / NUM_COLS;

type SubTab = "reco" | "shared" | "saved";

export default function ProfileTab() {
  const me = useAuth((s) => s.user);
  const profileMode = useProfileMode((s) => s.mode);
  const brandStatus = useProfileMode((s) => s.status);
  const setProfileMode = useProfileMode((s) => s.setMode);
  const [profileData, setProfileData] = useState<any>(null);
  const [stats, setStats] = useState({ communities_count: 0, posts_count: 0, followers_count: 0, following_count: 0 });
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [myReposts, setMyReposts] = useState<Post[]>([]);
  const [myBookmarks, setMyBookmarks] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>("reco");
  const [profileLayout, setProfileLayout] = useState<ProfileLayout>("masonry");

  const load = useCallback(async () => {
    const [pRes, postsRes, repostsRes, bookmarksRes] = await Promise.allSettled([
      profileApi.get(),
      feedApi.mine(),
      feedApi.myReposts(),
      feedApi.bookmarks(),
    ]);
    if (pRes.status === "fulfilled") {
      setProfileData(pRes.value.profile);
      setStats(pRes.value.stats);
      setProfileLayout(pRes.value.profile.profile_layout ?? "masonry");
    }
    if (postsRes.status === "fulfilled") setMyPosts(postsRes.value.data);
    if (repostsRes.status === "fulfilled") setMyReposts(repostsRes.value.data);
    if (bookmarksRes.status === "fulfilled") setMyBookmarks(bookmarksRes.value.data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(); };

  const displayName = profileData?.display_name ?? me?.username ?? "";
  const initial = displayName[0]?.toUpperCase() ?? "?";

  const currentData = subTab === "reco" ? myPosts : subTab === "shared" ? myReposts : myBookmarks;

  const profileHeader = (
    <View>
      {/* Top row: Avatar + Info + Settings */}
      <View style={s.topRow}>
        <Pressable onPress={() => router.push("/profile-edit")} style={s.avatarWrap}>
          {profileData?.avatar_url ? (
            <Image source={{ uri: profileData.avatar_url }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, s.avatarFallback]}>
              <Text style={s.avatarInitial}>{initial}</Text>
            </View>
          )}
          {profileData?.tier && profileData.tier !== "none" && (
            <View style={s.sealOverlay}>
              <VSeal tier={profileData.tier} opacity={profileData.tier_badge_opacity ?? 1} size="sm" showLabel />
            </View>
          )}
        </Pressable>

        <View style={s.infoCol}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={s.name}>
              {profileMode === "brand" && brandStatus?.brand?.brand_name ? brandStatus.brand.brand_name : displayName}
            </Text>
            {me?.role === "influencer" && profileData?.tier && profileData.tier !== "none" && (
              <CreatorBadge size="md" animate />
            )}
          </View>
          {me?.role === "influencer" && profileData?.tier && profileData.tier !== "none" && (
            <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 2 }}>Verifizierter Creator</Text>
          )}
          <Text style={s.handle}>@{me?.username}</Text>
        </View>

        <Pressable style={s.privacyBtn} onPress={() => router.push("/privacy-settings")} hitSlop={8}>
          <Shield color="#10B981" size={18} strokeWidth={2} />
        </Pressable>

        <Pressable style={s.shareBtn} onPress={async () => {
          try { await Share.share({ message: `Schau dir mein Profil auf Vouchmi an:\nhttps://vouchmi.com/@${me?.username}` }); } catch {}
        }} hitSlop={8}>
          <Share2 color="#6366F1" size={18} strokeWidth={2} />
        </Pressable>

        <Pressable style={s.settingsBtn} onPress={() => router.push("/settings")} hitSlop={8}>
          <Settings color="#64748B" size={20} strokeWidth={1.8} />
        </Pressable>
      </View>

      {/* Bio + Link */}
      {(!!profileData?.bio || !!profileData?.link) && (
        <View style={s.bioSection}>
          {!!profileData?.bio && <Text style={s.bio}>{profileData.bio}</Text>}
          {!!profileData?.link && (
            <Pressable style={s.linkRow} onPress={() => profileData.link && Linking.openURL(profileData.link)}>
              <LinkIcon2 color="#6366F1" size={12} strokeWidth={2} />
              <Text style={s.link} numberOfLines={1}>{profileData.link}</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Stats */}
      <View style={s.statsRow}>
        <StatCard value={stats.posts_count} label="Recos" accent="#F59E0B" />
        <StatCard value={stats.followers_count} label="Follower" accent="#6366F1" />
        <StatCard value={stats.following_count} label="Folge ich" accent="#10B981" />
      </View>

      {/* Profil-Modus-Switcher (nur wenn Brand-Abo aktiv) */}
      {brandStatus?.is_active && (
        <View style={s.modeSwitcher}>
          <Pressable
            style={[s.modePill, profileMode === "personal" && s.modePillOn]}
            onPress={() => setProfileMode("personal")}
          >
            <UserIcon color={profileMode === "personal" ? "#fff" : "#64748B"} size={14} strokeWidth={2} />
            <Text style={[s.modePillText, profileMode === "personal" && s.modePillTextOn]}>Persönlich</Text>
          </Pressable>
          <Pressable
            style={[s.modePill, profileMode === "brand" && s.modePillOn]}
            onPress={() => setProfileMode("brand")}
          >
            <Store color={profileMode === "brand" ? "#fff" : "#64748B"} size={14} strokeWidth={2} />
            <Text style={[s.modePillText, profileMode === "brand" && s.modePillTextOn]}>Brand</Text>
          </Pressable>
        </View>
      )}

      {/* Tier Progress */}
      <TierProgressBar
        tier={useTierStore.getState().tier}
        progressToNext={useTierStore.getState().progressToNext}
        nextTier={useTierStore.getState().nextTier as any}
      />

      {/* Sub Tabs */}
      <View style={s.subTabs}>
        <Pressable style={[s.subTab, subTab === "reco" && s.subTabOn]} onPress={() => setSubTab("reco")}>
          <Compass color={subTab === "reco" ? colors.accent : colors.grayDark} size={18} strokeWidth={1.8} />
          <Text style={[s.subTabText, subTab === "reco" && s.subTabTextOn]}>Reco</Text>
        </Pressable>
        <Pressable style={[s.subTab, subTab === "shared" && s.subTabOn]} onPress={() => setSubTab("shared")}>
          <Repeat2 color={subTab === "shared" ? colors.accent : colors.grayDark} size={18} strokeWidth={1.8} />
          <Text style={[s.subTabText, subTab === "shared" && s.subTabTextOn]}>Geteilt</Text>
        </Pressable>
        <Pressable style={[s.subTab, subTab === "saved" && s.subTabOn]} onPress={() => setSubTab("saved")}>
          <BookmarkIcon color={subTab === "saved" ? colors.accent : colors.grayDark} size={18} strokeWidth={1.8} />
          <Text style={[s.subTabText, subTab === "saved" && s.subTabTextOn]}>Gespeichert</Text>
        </Pressable>
      </View>
    </View>
  );

  const useScrollGallery = subTab === "reco" && (profileLayout === "masonry" || profileLayout === "featured");

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />
      ) : useScrollGallery ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        >
          {profileHeader}
          {profileLayout === "masonry" ? <MasonryGallery posts={myPosts} /> : <FeaturedGallery posts={myPosts} />}
        </ScrollView>
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(p) => p.id}
          numColumns={NUM_COLS}
          key={`grid-${NUM_COLS}`}
          columnWrapperStyle={currentData.length > 0 ? { gap: GAP } : undefined}
          ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          ListHeaderComponent={profileHeader}
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

function StatCard({ value, label, accent }: { value: number; label: string; accent: string }) {
  return (
    <Pressable style={[s.statCard, { borderColor: accent + "20" }]} onPress={() => router.push("/analytics")}>
      <View style={[s.statCardOverlay, { backgroundColor: accent + "0A" }]} />
      <Text style={[s.statValue, { color: accent }]}>{value.toLocaleString("de-DE")}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0E1A" },

  // Top row
  topRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 10, gap: 12 },
  avatarWrap: { position: "relative" },
  sealOverlay: { position: "absolute", bottom: -2, right: -2 },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: "#4F46E530" },
  avatarFallback: { backgroundColor: "#4F46E5", justifyContent: "center", alignItems: "center" },
  avatarInitial: { color: "#fff", fontSize: 26, fontWeight: "800" },
  infoCol: { flex: 1 },
  name: { color: "#FFFFFF", fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  handle: { color: "#64748B", fontSize: 13, marginTop: 1 },
  privacyBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#10B98110", justifyContent: "center", alignItems: "center" },
  shareBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#6366F110", justifyContent: "center", alignItems: "center" },
  settingsBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },

  // Bio
  bioSection: { paddingHorizontal: 16, marginTop: 8 },
  bio: { color: "#94A3B8", fontSize: 14, lineHeight: 20 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  link: { color: "#6366F1", fontSize: 13, fontWeight: "600" },

  // Stats
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, marginTop: 18 },
  statCard: {
    flex: 1,
    backgroundColor: "#141926",
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    overflow: "hidden",
  },
  statCardOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: 20 },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { color: "#64748B", fontSize: 12, fontWeight: "500", marginTop: 2 },

  // Mode switcher
  modeSwitcher: { flexDirection: "row", alignSelf: "center", backgroundColor: "#141926", borderRadius: 22, padding: 4, marginTop: 16, gap: 2 },
  modePill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20 },
  modePillOn: { backgroundColor: "#4F46E5" },
  modePillText: { color: "#64748B", fontSize: 13, fontWeight: "600" },
  modePillTextOn: { color: "#FFFFFF" },

  // Sub tabs
  subTabs: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: "#1E2235", marginTop: 16 },
  subTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: "transparent" },
  subTabOn: { borderBottomColor: colors.accent },
  subTabText: { color: "#4A5068", fontSize: 13, fontWeight: "600" },
  subTabTextOn: { color: colors.accent },

  // Empty
  empty: { padding: 40, alignItems: "center" },
  emptyText: { color: "#64748B", fontSize: 14 },

  // Grid
  tile: { width: TILE, height: TILE },
  tileImg: { width: "100%", height: "100%" },
  tileEmpty: { backgroundColor: "#141926", justifyContent: "center", alignItems: "center" },
  tileEmoji: { fontSize: 24 },
});
