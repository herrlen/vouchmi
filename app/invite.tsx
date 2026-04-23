import { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Share, Alert, FlatList, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { ChevronLeft, Send, Copy, MessageCircle } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { colors } from "../src/constants/theme";
import { communities as communitiesApi, type Community } from "../src/lib/api";

export default function InviteScreen() {
  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [selected, setSelected] = useState<Community | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    communitiesApi.mine().then((r) => {
      setMyCommunities(r.communities.filter((c) => c.role === "owner" || c.my_role === "owner"));
    }).catch(() => {});
  }, []);

  const generateLink = async (community: Community) => {
    setSelected(community);
    setLoading(true);
    try {
      const { invite_link } = await communitiesApi.invite(community.id);
      setInviteLink(invite_link);
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    }
    setLoading(false);
  };

  const shareLink = async () => {
    if (!inviteLink || !selected) return;
    await Share.share({
      message: `Hey! Tritt meiner Community "${selected.name}" auf Vouchmi bei:\n${inviteLink}`,
    });
  };

  const copyLink = async () => {
    if (!inviteLink) return;
    await Clipboard.setStringAsync(inviteLink);
    Alert.alert("Kopiert", "Einladungslink wurde in die Zwischenablage kopiert.");
  };

  const shareViaSMS = async () => {
    if (!inviteLink || !selected) return;
    await Share.share({
      message: `Hey! Schau dir meine Community "${selected.name}" auf Vouchmi an:\n${inviteLink}`,
    });
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10} accessibilityRole="button" accessibilityLabel="Zurueck">
          <ChevronLeft color={colors.white} size={24} strokeWidth={2} />
        </Pressable>
        <Text style={s.headerTitle}>Freunde einladen</Text>
        <View style={{ width: 44 }} />
      </View>

      {!selected ? (
        <View style={{ flex: 1 }}>
          <Text style={s.subtitle}>Wähle eine Community, zu der du einladen möchtest:</Text>
          <FlatList
            data={myCommunities}
            keyExtractor={(c) => c.id}
            contentContainerStyle={{ padding: 16, gap: 8 }}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={s.emptyText}>Du hast noch keine Communities erstellt.</Text>
                <Pressable style={s.emptyBtn} onPress={() => router.push("/create-community")}>
                  <Text style={s.emptyBtnText}>Community erstellen</Text>
                </Pressable>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable style={s.commCard} onPress={() => generateLink(item)} accessible accessibilityRole="button" accessibilityLabel={`${item.name}, ${item.member_count} Mitglieder. Einladungslink erstellen`}>
                <View style={[s.commAvatar, { backgroundColor: stringColor(item.name) }]} accessibilityElementsHidden>
                  <Text style={s.commInitial}>{item.name[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.commName}>{item.name}</Text>
                  <Text style={s.commMeta}>{item.member_count} Mitglieder</Text>
                </View>
              </Pressable>
            )}
          />
        </View>
      ) : (
        <View style={s.linkSection}>
          <Text style={s.linkCommunity}>{selected.name}</Text>

          {loading ? (
            <Text style={s.loadingText}>Einladungslink wird erstellt...</Text>
          ) : inviteLink ? (
            <>
              <View style={s.linkBox}>
                <Text style={s.linkText} numberOfLines={2}>{inviteLink}</Text>
              </View>

              <View style={s.actions}>
                <Pressable style={s.actionBtn} onPress={shareLink} accessibilityRole="button" accessibilityLabel="Einladungslink teilen">
                  <Send color={colors.accent} size={22} strokeWidth={1.8} />
                  <Text style={s.actionLabel}>Teilen</Text>
                </Pressable>
                <Pressable style={s.actionBtn} onPress={copyLink} accessibilityRole="button" accessibilityLabel="Einladungslink kopieren">
                  <Copy color={colors.accent} size={22} strokeWidth={1.8} />
                  <Text style={s.actionLabel}>Kopieren</Text>
                </Pressable>
                <Pressable style={s.actionBtn} onPress={shareViaSMS} accessibilityRole="button" accessibilityLabel="Einladung per SMS oder Chat senden">
                  <MessageCircle color={colors.accent} size={22} strokeWidth={1.8} />
                  <Text style={s.actionLabel}>SMS/Chat</Text>
                </Pressable>
              </View>

              <Text style={s.hint}>
                Der Link ist 7 Tage gültig und kann bis zu 50 Mal verwendet werden.
              </Text>
            </>
          ) : null}

          <Pressable style={s.backLink} onPress={() => { setSelected(null); setInviteLink(null); }}>
            <Text style={s.backLinkText}>← Andere Community wählen</Text>
          </Pressable>
        </View>
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
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, gap: 10 },
  backBtn: { minWidth: 44, minHeight: 44, justifyContent: "center" },
  headerTitle: { flex: 1, color: colors.white, fontSize: 17, fontWeight: "600" },
  subtitle: { color: colors.gray, fontSize: 14, paddingHorizontal: 16, paddingVertical: 12 },
  empty: { alignItems: "center", paddingTop: 40 },
  emptyText: { color: colors.gray, fontSize: 14, marginBottom: 16 },
  emptyBtn: { backgroundColor: colors.accent, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 10 },
  emptyBtnText: { color: "#fff", fontWeight: "700" },
  commCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bgCard, borderRadius: 14, padding: 14, gap: 12 },
  commAvatar: { width: 48, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  commInitial: { color: "#fff", fontSize: 20, fontWeight: "800" },
  commName: { color: colors.white, fontSize: 15, fontWeight: "600" },
  commMeta: { color: colors.gray, fontSize: 12, marginTop: 2 },
  linkSection: { padding: 24, alignItems: "center" },
  linkCommunity: { color: colors.white, fontSize: 20, fontWeight: "700", marginBottom: 20 },
  loadingText: { color: colors.gray, fontSize: 14 },
  linkBox: { backgroundColor: colors.bgCard, borderRadius: 12, padding: 16, width: "100%", marginBottom: 24 },
  linkText: { color: colors.accent, fontSize: 14, textAlign: "center" },
  actions: { flexDirection: "row", gap: 24, marginBottom: 24 },
  actionBtn: { alignItems: "center", gap: 6, minWidth: 70, minHeight: 60 },
  actionLabel: { color: colors.white, fontSize: 12, fontWeight: "500" },
  hint: { color: colors.grayDark, fontSize: 12, textAlign: "center", lineHeight: 17 },
  backLink: { marginTop: 30 },
  backLinkText: { color: colors.accent, fontSize: 14 },
});
