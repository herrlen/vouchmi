import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Image, TextInput, Pressable, ActivityIndicator, Alert, RefreshControl, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search as SearchIcon, Plus, Heart, MessageCircle, Repeat2, LayoutGrid } from "lucide-react-native";
import { router } from "expo-router";
import { colors } from "../../src/constants/theme";
import { communities as communitiesApi, feed as feedApi, users as usersApi, type Community, type Post } from "../../src/lib/api";
import { useScrollStore } from "../../src/lib/scroll-store";

const BUBBLE_SIZE = 62;

type RecoFilter = "likes" | "comments" | "shares";
type CommFilter = "followers" | "new" | "random";

export default function SearchTab() {
  const [query, setQuery] = useState("");
  const [communities, setCommunities] = useState<Community[]>([]);
  const [topReco, setTopReco] = useState<Post[]>([]);
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recoFilter, setRecoFilter] = useState<RecoFilter>("likes");
  const [commFilter, setCommFilter] = useState<CommFilter>("followers");

  const load = useCallback(async () => {
    try {
      const [cRes, tRes, fRes] = await Promise.all([
        communitiesApi.discover(commFilter),
        feedApi.top(recoFilter),
        feedApi.all(),
      ]);
      setCommunities(cRes.communities);
      setTopReco(tRes.posts);
      setFeedPosts(fRes.data);
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    }
    setLoading(false);
    setRefreshing(false);
  }, [recoFilter, commFilter]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const openReco = (post: Post) => {
    router.push(`/community/${post.community_id}`);
  };

  const toggleFollowComm = async (c: Community) => {
    try {
      if (c.is_followed) {
        const { follower_count } = await communitiesApi.unfollow(c.id);
        setCommunities((arr) => arr.map((x) => x.id === c.id ? { ...x, is_followed: false, follower_count } : x));
      } else {
        const { follower_count } = await communitiesApi.follow(c.id);
        setCommunities((arr) => arr.map((x) => x.id === c.id ? { ...x, is_followed: true, follower_count } : x));
      }
    } catch (e: any) { Alert.alert("Fehler", e.message); }
  };

  const filteredComm = query
    ? communities.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : communities;

  const uniqueAuthors = feedPosts
    .map((p) => p.author)
    .filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i)
    .slice(0, 10);

  const postsWithImages = feedPosts.filter((p) => !!p.link_image);

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.header}><Text style={s.title}>Entdecken</Text></View>

      <View style={s.searchBar}>
        <SearchIcon color={colors.gray} size={18} />
        <TextInput style={s.searchInput} placeholder="Suche Communities, Produkte..." placeholderTextColor={colors.gray}
          value={query} onChangeText={setQuery} autoCapitalize="none" />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        >
            <View>

              {/* Top 3 Reco with filter */}
              <View style={s.sectionHead}>
                <Text style={s.sectionTitle}>Top 3 Reco</Text>
                <View style={s.filterRow}>
                  <FilterChip icon={<Heart size={12} color={recoFilter === "likes" ? "#fff" : colors.gray} />} active={recoFilter === "likes"} onPress={() => setRecoFilter("likes")} />
                  <FilterChip icon={<MessageCircle size={12} color={recoFilter === "comments" ? "#fff" : colors.gray} />} active={recoFilter === "comments"} onPress={() => setRecoFilter("comments")} />
                  <FilterChip icon={<Repeat2 size={12} color={recoFilter === "shares" ? "#fff" : colors.gray} />} active={recoFilter === "shares"} onPress={() => setRecoFilter("shares")} />
                </View>
              </View>
              <View style={s.topRecoRow}>
                {topReco.length === 0 ? (
                  <Text style={s.emptyText}>Keine Treffer</Text>
                ) : topReco.slice(0, 3).map((p) => (
                  <Pressable key={p.id} style={s.topRecoCard} onPress={() => openReco(p)}>
                    {p.link_image ? (
                      <Image source={{ uri: p.link_image }} style={s.topRecoImg} />
                    ) : (
                      <View style={[s.topRecoImg, { backgroundColor: colors.bgCard }]} />
                    )}
                    <Text style={s.topRecoTitle} numberOfLines={2}>{p.link_title ?? p.content}</Text>
                    {p.community?.name && <Text style={s.topRecoCommunity} numberOfLines={1}>{p.community.name}</Text>}
                    <View style={s.topRecoMeta}>
                      {recoFilter === "likes" && <><Heart size={10} color={colors.gray} /><Text style={s.topRecoMetaText}>{p.like_count}</Text></>}
                      {recoFilter === "comments" && <><MessageCircle size={10} color={colors.gray} /><Text style={s.topRecoMetaText}>{p.comment_count}</Text></>}
                      {recoFilter === "shares" && <><Repeat2 size={10} color={colors.gray} /><Text style={s.topRecoMetaText}>{p.repost_count ?? 0}</Text></>}
                    </View>
                  </Pressable>
                ))}
              </View>

              {/* Top Communities with filter */}
              <View style={s.sectionHead}>
                <Text style={s.sectionTitle}>Top Communities</Text>
                <View style={s.filterRow}>
                  <TextChip label="Follower" active={commFilter === "followers"} onPress={() => setCommFilter("followers")} />
                  <TextChip label="Neu" active={commFilter === "new"} onPress={() => setCommFilter("new")} />
                  <TextChip label="Zufall" active={commFilter === "random"} onPress={() => setCommFilter("random")} />
                </View>
              </View>
              {filteredComm.length === 0 ? (
                <Text style={s.emptyText}>{query ? "Keine Treffer" : "Keine Communities"}</Text>
              ) : (
                <View style={{ paddingHorizontal: 12 }}>
                  {filteredComm.slice(0, 5).map((c) => (
                    <View key={c.id} style={s.commRow}>
                      <Pressable style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 12 }} onPress={() => router.push(`/community/${c.id}`)}>
                        {c.image_url ? (
                          <Image source={{ uri: c.image_url }} style={s.commImg} />
                        ) : (
                          <View style={[s.commImg, { backgroundColor: stringColor(c.name) }]}>
                            <Text style={s.commInitial}>{c.name[0]?.toUpperCase()}</Text>
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={s.commName} numberOfLines={1}>{c.name}</Text>
                          <Text style={s.commSub}>
                            {c.follower_count ?? 0} Follower · {c.member_count} Mitglieder
                          </Text>
                        </View>
                      </Pressable>
                      <Pressable style={[s.followBtn, c.is_followed && s.followBtnActive]} onPress={() => toggleFollowComm(c)}>
                        <Text style={[s.followBtnText, c.is_followed && s.followBtnTextActive]}>
                          {c.is_followed ? "Folgt" : "Folgen"}
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              {/* CTA-Buttons am Listen-Ende */}
              <View style={s.ctaBlock}>
                <Pressable
                  style={s.ctaSecondary}
                  onPress={() => router.push("/discover")}
                  accessibilityRole="button"
                  accessibilityLabel="Mehr entdecken"
                >
                  <LayoutGrid color={colors.white} size={18} strokeWidth={2} />
                  <Text style={s.ctaSecondaryText}>Mehr entdecken</Text>
                </Pressable>

                <Pressable
                  style={s.ctaOutline}
                  onPress={() => router.push("/create-community")}
                  accessibilityRole="button"
                  accessibilityLabel="Community erstellen"
                >
                  <Plus color={colors.accent} size={18} strokeWidth={2.2} />
                  <Text style={s.ctaOutlineText}>Community erstellen</Text>
                </Pressable>
              </View>
            </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function FilterChip({ icon, active, onPress }: { icon: React.ReactNode; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[s.chip, active && s.chipActive]} onPress={onPress} hitSlop={6}>
      {icon}
    </Pressable>
  );
}

function TextChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[s.textChip, active && s.chipActive]} onPress={onPress} hitSlop={6}>
      <Text style={[s.textChipText, active && { color: "#fff" }]}>{label}</Text>
    </Pressable>
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
  header: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  title: { color: colors.white, fontSize: 26, fontWeight: "700" },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bgInput, marginHorizontal: 12, marginBottom: 8, borderRadius: 10, paddingHorizontal: 12, height: 40, gap: 8 },
  searchInput: { flex: 1, color: colors.white, fontSize: 14 },


  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, marginBottom: 10, paddingHorizontal: 16 },
  sectionTitle: { color: colors.white, fontSize: 15, fontWeight: "600" },
  filterRow: { flexDirection: "row", gap: 6 },
  chip: { width: 30, height: 26, borderRadius: 13, backgroundColor: colors.bgCard, justifyContent: "center", alignItems: "center" },
  chipActive: { backgroundColor: colors.accent },
  textChip: { paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: colors.bgCard, justifyContent: "center", alignItems: "center" },
  textChipText: { color: colors.gray, fontSize: 11, fontWeight: "600" },

  topRecoRow: { flexDirection: "row", gap: 8, paddingHorizontal: 12, marginBottom: 4 },
  topRecoCard: { flex: 1, backgroundColor: colors.bgCard, borderRadius: 12, overflow: "hidden" },
  topRecoImg: { width: "100%", aspectRatio: 1 },
  topRecoTitle: { color: colors.white, fontSize: 11, fontWeight: "600", paddingHorizontal: 8, paddingTop: 6, lineHeight: 14 },
  topRecoCommunity: { color: colors.accent, fontSize: 10, fontWeight: "600", paddingHorizontal: 8, marginTop: 2 },
  topRecoMeta: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 6 },
  topRecoMetaText: { color: colors.gray, fontSize: 11 },

  emptyText: { color: colors.gray, marginHorizontal: 16, fontSize: 13, marginBottom: 10 },

  commRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bgCard, padding: 10, borderRadius: 12, marginBottom: 8, gap: 10 },
  commImg: { width: 50, height: 50, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  commInitial: { color: "#fff", fontSize: 22, fontWeight: "800" },
  commName: { color: colors.white, fontSize: 14, fontWeight: "600" },
  commSub: { color: colors.gray, fontSize: 12, marginTop: 2 },

  followBtn: { backgroundColor: colors.accent, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, minHeight: 30, justifyContent: "center" },
  followBtnActive: { backgroundColor: colors.bgInput },
  followBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  followBtnTextActive: { color: colors.white },

  gridItem: { flex: 1 / 3, aspectRatio: 1, backgroundColor: colors.bgCard },
  gridImage: { width: "100%", height: "100%" },

  // Action-Buttons am Listen-Ende (WhatsApp-Kanäle-Pattern)
  ctaBlock: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 32, gap: 12 },
  ctaSecondary: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "#1A1D2E",
    borderRadius: 14, minHeight: 50, paddingHorizontal: 16,
  },
  ctaSecondaryText: { color: colors.white, fontSize: 16, fontWeight: "600" },
  ctaOutline: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "transparent",
    borderRadius: 14, minHeight: 50, paddingHorizontal: 16,
    borderWidth: 1.5, borderColor: colors.accent,
  },
  ctaOutlineText: { color: colors.accent, fontSize: 16, fontWeight: "600" },
});
