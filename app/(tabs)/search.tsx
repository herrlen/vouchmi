import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Image, TextInput, Pressable, ActivityIndicator, Alert, RefreshControl, Linking, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search as SearchIcon, Plus } from "lucide-react-native";
import { router } from "expo-router";
import { colors } from "../../src/constants/theme";
import { communities as communitiesApi, feed as feedApi, links as linksApi, type Community, type Post } from "../../src/lib/api";
import { useAuth } from "../../src/lib/store";

const BUBBLE_SIZE = 62;

export default function SearchTab() {
  const me = useAuth((s) => s.user);
  const [query, setQuery] = useState("");
  const [communities, setCommunities] = useState<Community[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [cRes, fRes] = await Promise.all([communitiesApi.discover(), feedApi.all()]);
      setCommunities(cRes.communities);
      setPosts(fRes.data);
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const openShop = async (post: Post) => {
    const url = post.link_affiliate_url ?? post.link_url;
    if (!url) return;
    linksApi.trackClick({ post_id: post.id, community_id: post.community_id, original_url: post.link_url ?? url, affiliate_url: url }).catch(() => {});
    try { await Linking.openURL(url); } catch {}
  };

  const filteredComm = query ? communities.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())) : communities;

  const uniqueAuthors = posts
    .map((p) => p.author)
    .filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i)
    .slice(0, 10);

  const postsWithImages = posts.filter((p) => !!p.link_image);

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.header}><Text style={s.title}>Entdecken</Text></View>

      <View style={s.searchBar}>
        <SearchIcon color={colors.gray} size={18} />
        <TextInput style={s.searchInput} placeholder="Suche Communities, Produkte..." placeholderTextColor={colors.gray} value={query} onChangeText={setQuery} autoCapitalize="none" />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={postsWithImages}
          keyExtractor={(p) => p.id}
          numColumns={3}
          columnWrapperStyle={{ gap: 2 }}
          contentContainerStyle={{ gap: 2, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          ListHeaderComponent={
            <View>
              {/* Story Bubbles */}
              <View style={s.storiesWrap}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.storiesRow}>
                  <Pressable style={s.storyItem} onPress={() => router.push("/create-story")}>
                    <View style={[s.storyRing, s.storyRingMine]}>
                      <View style={s.storyPlus}><Plus color={colors.accent} size={26} /></View>
                    </View>
                    <Text style={s.storyLabel}>Du</Text>
                  </Pressable>
                  {uniqueAuthors.map((author) => (
                    <Pressable key={author.id} style={s.storyItem}>
                      <View style={[s.storyRing, s.storyRingActive]}>
                        {author.avatar_url ? (
                          <Image source={{ uri: author.avatar_url }} style={s.storyAvatar} />
                        ) : (
                          <View style={[s.storyAvatar, s.storyAvatarPlaceholder]}>
                            <Text style={s.storyAvatarInitial}>{(author.display_name ?? author.username)[0]?.toUpperCase()}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.storyLabel} numberOfLines={1}>{author.username}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Top Communities */}
              <Text style={s.sectionTitle}>Top Communities</Text>
              {filteredComm.length === 0 ? (
                <Text style={s.emptyText}>{query ? "Keine Treffer" : "Keine Communities"}</Text>
              ) : (
                <View style={{ paddingHorizontal: 12 }}>
                  {filteredComm.slice(0, 5).map((c) => (
                    <Pressable key={c.id} style={s.commRow} onPress={() => router.push(`/community/${c.id}`)}>
                      <View style={[s.commImg, { backgroundColor: stringColor(c.name) }]}>
                        <Text style={s.commInitial}>{c.name[0]?.toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.commName} numberOfLines={1}>{c.name}</Text>
                        <Text style={s.commSub}>{c.member_count} Mitglieder{c.category ? ` · ${c.category}` : ""}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}

              {postsWithImages.length > 0 && <Text style={s.sectionTitle}>Neue Produkte</Text>}
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={s.gridItem} onPress={() => openShop(item)}>
              <Image source={{ uri: item.link_image! }} style={s.gridImage} />
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function stringColor(s: string) {
  const c = ["#25D366", "#34B7F1", "#F15C6D", "#FFB800", "#8B5CF6"];
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
  storiesWrap: { borderBottomWidth: 0.5, borderBottomColor: colors.border, paddingVertical: 10 },
  storiesRow: { paddingHorizontal: 12, gap: 14 },
  storyItem: { alignItems: "center", width: BUBBLE_SIZE + 8 },
  storyRing: { width: BUBBLE_SIZE + 6, height: BUBBLE_SIZE + 6, borderRadius: (BUBBLE_SIZE + 6) / 2, justifyContent: "center", alignItems: "center", borderWidth: 2 },
  storyRingActive: { borderColor: colors.accent },
  storyRingMine: { borderColor: "transparent", backgroundColor: colors.bgCard },
  storyAvatar: { width: BUBBLE_SIZE, height: BUBBLE_SIZE, borderRadius: BUBBLE_SIZE / 2 },
  storyAvatarPlaceholder: { backgroundColor: colors.bgInput, justifyContent: "center", alignItems: "center" },
  storyAvatarInitial: { color: colors.white, fontWeight: "700", fontSize: 22 },
  storyPlus: { width: BUBBLE_SIZE, height: BUBBLE_SIZE, borderRadius: BUBBLE_SIZE / 2, backgroundColor: colors.bgInput, justifyContent: "center", alignItems: "center" },
  storyLabel: { color: colors.gray, fontSize: 11, marginTop: 5, maxWidth: BUBBLE_SIZE + 8, textAlign: "center" },
  sectionTitle: { color: colors.white, fontSize: 15, fontWeight: "600", marginTop: 14, marginBottom: 10, marginHorizontal: 16 },
  emptyText: { color: colors.gray, marginHorizontal: 16, fontSize: 13 },
  commRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bgCard, padding: 10, borderRadius: 12, marginBottom: 8, gap: 12 },
  commImg: { width: 50, height: 50, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  commInitial: { color: "#fff", fontSize: 22, fontWeight: "800" },
  commName: { color: colors.white, fontSize: 14, fontWeight: "600" },
  commSub: { color: colors.gray, fontSize: 12, marginTop: 2 },
  gridItem: { flex: 1 / 3, aspectRatio: 1, backgroundColor: colors.bgCard },
  gridImage: { width: "100%", height: "100%" },
});
