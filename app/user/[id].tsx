import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Image, Pressable, FlatList, Dimensions, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { ChevronLeft, Link as LinkIcon, MessageCircle } from "lucide-react-native";
import { colors } from "../../src/constants/theme";
import { users as usersApi, feed as feedApi, type Post, type User, type ProfileLayout, influencer as influencerApi } from "../../src/lib/api";
import { useAuth } from "../../src/lib/store";
import MasonryGallery from "../../src/components/gallery/MasonryGallery";
import FeaturedGallery from "../../src/components/gallery/FeaturedGallery";
import CreatorBadge from "../../src/components/CreatorBadge";

const { width } = Dimensions.get("window");
const TILE = (width - 4) / 3;

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useAuth((s) => s.user);
  const [profileData, setProfileData] = useState<any>(null);
  const [stats, setStats] = useState({ posts_count: 0, followers_count: 0, following_count: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowingMe, setIsFollowingMe] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileLayout, setProfileLayout] = useState<ProfileLayout>("masonry");

  useEffect(() => {
    if (!id) return;
    Promise.all([
      usersApi.profile(id).then((r) => { setProfileData(r.profile); setStats(r.stats); setIsFollowing(r.is_following); setIsFollowingMe((r as any).is_following_me ?? false); setProfileLayout(r.profile.profile_layout ?? "masonry"); }),
      feedApi.all().then((r) => setPosts(r.data.filter((p) => p.author.id === id))),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const toggleFollow = async () => {
    if (!id) return;
    try {
      if (isFollowing) {
        const { followers_count } = await usersApi.unfollow(id);
        setIsFollowing(false);
        setStats((s) => ({ ...s, followers_count }));
      } else {
        const { followers_count } = await usersApi.follow(id);
        setIsFollowing(true);
        setStats((s) => ({ ...s, followers_count }));
      }
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    }
  };

  const isMe = me?.id === id;
  const displayName = profileData?.display_name ?? profileData?.username ?? "";
  const initial = displayName[0]?.toUpperCase() ?? "?";

  // Messaging-Permission: gegenseitiges Follow erlaubt DM
  const canMessage = !isMe && isFollowing && isFollowingMe;

  if (loading) return <SafeAreaView style={s.container} edges={["top"]}><Stack.Screen options={{ headerShown: false }} /><ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} /></SafeAreaView>;

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
          <ChevronLeft color={colors.white} size={24} strokeWidth={2} />
        </Pressable>
        <Text style={s.headerTitle} numberOfLines={1}>@{profileData?.username ?? ""}</Text>
        <View style={{ width: 44 }} />
      </View>

      {profileLayout === "masonry" || profileLayout === "featured" ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={s.profileSection}>
            <View style={s.topRow}>
              {profileData?.avatar_url ? (
                <Image source={{ uri: profileData.avatar_url }} style={s.avatar} />
              ) : (
                <View style={[s.avatar, s.avatarFallback]}><Text style={s.avatarInitial}>{initial}</Text></View>
              )}
              <View style={s.statsRow}>
                <Stat label="Posts" value={stats.posts_count} />
                <Stat label="Follower" value={stats.followers_count} />
                <Stat label="Folge ich" value={stats.following_count} />
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={s.name}>{displayName}</Text>
              {profileData?.is_creator && <CreatorBadge size="md" />}
            </View>
            {profileData?.is_creator && (
              <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 2 }}>Verifizierter Creator</Text>
            )}
            {profileData?.bio && <Text style={s.bio}>{profileData.bio}</Text>}
            {profileData?.link && (
              <View style={s.linkRow}><LinkIcon color={colors.accent} size={13} /><Text style={s.link} numberOfLines={1}>{profileData.link}</Text></View>
            )}
            {!isMe && (
              <View style={s.actionRow}>
                <Pressable style={[s.followBtn, isFollowing && s.followBtnActive, canMessage && { flex: 1 }]} onPress={toggleFollow}>
                  <Text style={[s.followText, isFollowing && s.followTextActive]}>{isFollowing ? "Entfolgen" : "Folgen"}</Text>
                </Pressable>
                {canMessage && (
                  <Pressable
                    style={s.messageBtn}
                    onPress={() => router.push({ pathname: "/messages/[userId]", params: { userId: id } })}
                    accessibilityLabel={`Nachricht an ${displayName} senden`}
                    accessibilityRole="button"
                  >
                    <MessageCircle color={colors.white} size={18} />
                    <Text style={s.messageBtnText}>Nachricht</Text>
                  </Pressable>
                )}
              </View>
            )}
            <View style={s.divider} />
          </View>
          {profileLayout === "masonry" ? <MasonryGallery posts={posts} /> : <FeaturedGallery posts={posts} />}
        </ScrollView>
      ) : (
        <FlatList
          data={posts.filter((p) => p.link_image)}
          keyExtractor={(p) => p.id}
          numColumns={3}
          columnWrapperStyle={posts.length > 0 ? { gap: 2 } : undefined}
          contentContainerStyle={{ paddingBottom: 40, gap: 2 }}
          ListHeaderComponent={
            <View style={s.profileSection}>
              <View style={s.topRow}>
                {profileData?.avatar_url ? (
                  <Image source={{ uri: profileData.avatar_url }} style={s.avatar} />
                ) : (
                  <View style={[s.avatar, s.avatarFallback]}><Text style={s.avatarInitial}>{initial}</Text></View>
                )}
                <View style={s.statsRow}>
                  <Stat label="Posts" value={stats.posts_count} />
                  <Stat label="Follower" value={stats.followers_count} />
                  <Stat label="Folge ich" value={stats.following_count} />
                </View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={s.name}>{displayName}</Text>
              {profileData?.is_creator && <CreatorBadge size="md" />}
            </View>
            {profileData?.is_creator && (
              <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 2 }}>Verifizierter Creator</Text>
            )}
              {profileData?.bio && <Text style={s.bio}>{profileData.bio}</Text>}
              {profileData?.link && (
                <View style={s.linkRow}><LinkIcon color={colors.accent} size={13} /><Text style={s.link} numberOfLines={1}>{profileData.link}</Text></View>
              )}
              {!isMe && (
                <Pressable style={[s.followBtn, isFollowing && s.followBtnActive]} onPress={toggleFollow}>
                  <Text style={[s.followText, isFollowing && s.followTextActive]}>{isFollowing ? "Entfolgen" : "Folgen"}</Text>
                </Pressable>
              )}
              <View style={s.divider} />
            </View>
          }
          ListEmptyComponent={<Text style={s.emptyText}>Noch keine Posts.</Text>}
          renderItem={({ item }) => (
            <Pressable style={s.tile}><Image source={{ uri: item.link_image! }} style={s.tileImg} /></Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <View style={s.stat}><Text style={s.statValue}>{value}</Text><Text style={s.statLabel}>{label}</Text></View>;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, gap: 10 },
  backBtn: { minWidth: 44, minHeight: 44, justifyContent: "center" },
  headerTitle: { flex: 1, color: colors.white, fontSize: 17, fontWeight: "600" },
  profileSection: { paddingHorizontal: 16, paddingBottom: 8 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  avatar: { width: 86, height: 86, borderRadius: 43 },
  avatarFallback: { backgroundColor: colors.accent, justifyContent: "center", alignItems: "center" },
  avatarInitial: { color: "#fff", fontSize: 38, fontWeight: "800" },
  statsRow: { flex: 1, flexDirection: "row", justifyContent: "space-around" },
  stat: { alignItems: "center" },
  statValue: { color: colors.white, fontSize: 20, fontWeight: "700" },
  statLabel: { color: colors.gray, fontSize: 12, marginTop: 2 },
  name: { color: colors.white, fontSize: 16, fontWeight: "700", marginTop: 12 },
  bio: { color: colors.white, fontSize: 13, lineHeight: 18, marginTop: 6 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  link: { color: colors.accent, fontSize: 13, flex: 1 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  followBtn: { backgroundColor: colors.accent, borderRadius: 8, paddingVertical: 10, alignItems: "center", minHeight: 44, justifyContent: "center" },
  messageBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.bgCard, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16, minHeight: 44, borderWidth: 1, borderColor: colors.border },
  messageBtnText: { color: colors.white, fontSize: 14, fontWeight: "600" },
  followBtnActive: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  followText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  followTextActive: { color: colors.white },
  divider: { borderTopWidth: 0.5, borderTopColor: colors.border, marginTop: 16, marginHorizontal: -16, paddingTop: 8 },
  emptyText: { color: colors.gray, textAlign: "center", marginTop: 40, fontSize: 14 },
  tile: { width: TILE, height: TILE },
  tileImg: { width: "100%", height: "100%" },
});
