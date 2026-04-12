import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Image, TextInput, Pressable, ActivityIndicator, Alert, RefreshControl, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search as SearchIcon } from "lucide-react-native";
import { router } from "expo-router";
import { colors } from "../../src/constants/theme";
import { communities as communitiesApi, feed as feedApi, links as linksApi, type Community, type Post } from "../../src/lib/api";

export default function SearchTab() {
  const [query, setQuery] = useState("");
  const [communities, setCommunities] = useState<Community[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [cRes, fRes] = await Promise.all([
        communitiesApi.discover(),
        feedApi.all(),
      ]);
      setCommunities(cRes.communities);
      setPosts(fRes.data.filter((p) => !!p.link_image));
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
    linksApi.trackClick({
      post_id: post.id,
      community_id: post.community_id,
      original_url: post.link_url ?? url,
      affiliate_url: url,
    }).catch(() => {});
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) await Linking.openURL(url);
    } catch {}
  };

  const filteredCommunities = query
    ? communities.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : communities;

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.title}>Entdecken</Text>
      </View>

      <View style={s.searchBar}>
        <SearchIcon color={colors.gray} size={18} />
        <TextInput
          style={s.searchInput}
          placeholder="Communities durchsuchen"
          placeholderTextColor={colors.gray}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          numColumns={3}
          columnWrapperStyle={{ gap: 2 }}
          contentContainerStyle={{ gap: 2, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          ListHeaderComponent={
            <View>
              <Text style={s.sectionTitle}>Communities entdecken</Text>
              {filteredCommunities.length === 0 ? (
                <Text style={s.emptyText}>{query ? "Keine Treffer" : "Keine Communities gefunden"}</Text>
              ) : (
                <View style={{ paddingHorizontal: 12 }}>
                  {filteredCommunities.slice(0, 8).map((c) => (
                    <Pressable
                      key={c.id}
                      style={s.commRow}
                      onPress={() => router.push(`/community/${c.id}`)}
                    >
                      <View style={[s.commImg, { backgroundColor: stringColor(c.name) }]}>
                        <Text style={s.commInitial}>{c.name[0]?.toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.commName} numberOfLines={1}>{c.name}</Text>
                        <Text style={s.commSub} numberOfLines={1}>
                          {c.member_count} {c.member_count === 1 ? "Mitglied" : "Mitglieder"}
                          {c.category ? ` · ${c.category}` : ""}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}

              {posts.length > 0 && <Text style={s.sectionTitle}>Neue Produkte</Text>}
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={s.gridItem} onPress={() => openShop(item)}>
              {item.link_image && <Image source={{ uri: item.link_image }} style={s.gridImage} />}
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgInput,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: { flex: 1, color: colors.white, fontSize: 14 },
  sectionTitle: { color: colors.white, fontSize: 15, fontWeight: "600", marginTop: 14, marginBottom: 10, marginHorizontal: 16 },
  emptyText: { color: colors.gray, marginHorizontal: 16, fontSize: 13 },
  commRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgCard,
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  commImg: { width: 50, height: 50, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  commInitial: { color: "#fff", fontSize: 22, fontWeight: "800" },
  commName: { color: colors.white, fontSize: 14, fontWeight: "600" },
  commSub: { color: colors.gray, fontSize: 12, marginTop: 2 },
  gridItem: { flex: 1 / 3, aspectRatio: 1, backgroundColor: colors.bgCard },
  gridImage: { width: "100%", height: "100%" },
});
