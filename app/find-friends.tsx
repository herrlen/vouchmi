import { useState } from "react";
import { View, Text, Pressable, StyleSheet, FlatList, Alert, ActivityIndicator, Image, Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import * as Contacts from "expo-contacts";
import { ChevronLeft, Users, UserPlus, ShieldCheck, Lock, Send } from "lucide-react-native";
import { colors } from "../src/constants/theme";
import { users as usersApi, type User } from "../src/lib/api";

type FoundUser = User & { is_following?: boolean };
type Step = "pre-permission" | "loading" | "results";

export default function FindFriendsScreen() {
  const [step, setStep] = useState<Step>("pre-permission");
  const [found, setFound] = useState<FoundUser[]>([]);
  const [notFoundCount, setNotFoundCount] = useState(0);

  const requestAndMatch = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Berechtigung verweigert", "Du kannst den Zugriff jederzeit in den iOS-Einstellungen ändern.");
      return;
    }

    setStep("loading");

    try {
      const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers] });
      const phones: string[] = [];
      data.forEach((c) => {
        c.phoneNumbers?.forEach((p) => {
          if (p.number) {
            const clean = p.number.replace(/[\s\-\(\)]/g, "");
            phones.push(clean);
          }
        });
      });

      const enc = new TextEncoder();
      const hashes = await Promise.all(
        phones.map(async (p) => {
          const buf = await globalThis.crypto.subtle.digest("SHA-256", enc.encode(p));
          return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
        })
      );

      // TODO: Backend-Endpoint POST /contacts/match mit hashes
      // Für jetzt: simuliere leere Ergebnisse (Backend noch nicht implementiert)
      setFound([]);
      setNotFoundCount(phones.length);
      setStep("results");
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
      setStep("pre-permission");
    }
  };

  const inviteFriend = async () => {
    try {
      await Share.share({ message: "Hey! Ich bin auf Vouchmi – die Community-Commerce-App für Empfehlungen. Probier's aus:\nhttps://vouchmi.com/download" });
    } catch {}
  };

  // Pre-Permission Screen
  if (step === "pre-permission") {
    return (
      <SafeAreaView style={s.container} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}><ChevronLeft color={colors.white} size={24} strokeWidth={2} /></Pressable>
          <View style={{ width: 44 }} />
        </View>

        <View style={s.preContent}>
          <View style={s.preIconWrap}>
            <Users color={colors.accent} size={48} strokeWidth={1.5} />
          </View>
          <Text style={s.preTitle}>Finde deine Freunde auf Vouchmi</Text>
          <Text style={s.preText}>
            Damit du sehen kannst, welche deiner Freunde bereits Vouchmi nutzen, gleichen wir die Telefonnummern aus deinem Adressbuch verschlüsselt mit unserer Datenbank ab.
          </Text>

          <View style={s.preBullets}>
            <View style={s.bullet}>
              <Lock color={colors.accent} size={18} strokeWidth={1.8} />
              <Text style={s.bulletText}>Deine Privatsphäre: Wir speichern deine Kontakte nicht dauerhaft und nutzen sie ausschließlich für diesen Abgleich.</Text>
            </View>
            <View style={s.bullet}>
              <ShieldCheck color={colors.accent} size={18} strokeWidth={1.8} />
              <Text style={s.bulletText}>Kein Spam: Wir senden ohne deine Erlaubnis keine Nachrichten an deine Kontakte.</Text>
            </View>
          </View>

          <Text style={s.preFootnote}>Du kannst diese Berechtigung jederzeit in den Einstellungen widerrufen.</Text>

          <Pressable style={s.primaryBtn} onPress={requestAndMatch}>
            <UserPlus color={colors.bg} size={20} strokeWidth={2} />
            <Text style={s.primaryBtnText}>Jetzt Freunde finden</Text>
          </Pressable>
          <Pressable style={s.laterBtn} onPress={() => router.back()}>
            <Text style={s.laterText}>Später</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Loading
  if (step === "loading") {
    return (
      <SafeAreaView style={[s.container, s.centerContent]} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={s.loadingText}>Kontakte werden verschlüsselt abgeglichen...</Text>
        <Text style={s.loadingSubText}>Deine Daten verlassen dein Gerät nur als Hash-Werte.</Text>
      </SafeAreaView>
    );
  }

  // Results
  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}><ChevronLeft color={colors.white} size={24} strokeWidth={2} /></Pressable>
        <Text style={s.headerTitle}>Freunde finden</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={s.resultBanner}>
        <Text style={s.resultCount}>{found.length} {found.length === 1 ? "Freund" : "Freunde"} gefunden</Text>
      </View>

      <FlatList
        data={found}
        keyExtractor={(u) => u.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={s.emptyResult}>
            <Text style={s.emptyEmoji}>👀</Text>
            <Text style={s.emptyTitle}>Noch keine Freunde auf Vouchmi</Text>
            <Text style={s.emptyText}>Lade deine Freunde ein, dann findest du sie hier.</Text>
          </View>
        }
        ListFooterComponent={
          <View style={{ marginTop: 20 }}>
            <Pressable style={s.inviteBtn} onPress={inviteFriend}>
              <Send color={colors.accent} size={18} strokeWidth={1.8} />
              <Text style={s.inviteBtnText}>Freunde zu Vouchmi einladen</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.userRow}>
            {item.avatar_url ? (
              <Image source={{ uri: item.avatar_url }} style={s.userAvatar} />
            ) : (
              <View style={[s.userAvatar, s.userAvatarFallback]}>
                <Text style={s.userInitial}>{(item.display_name ?? item.username)[0]?.toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.userName}>{item.display_name ?? item.username}</Text>
              <Text style={s.userHandle}>@{item.username}</Text>
            </View>
            <Pressable style={s.followBtn}>
              <Text style={s.followBtnText}>Folgen</Text>
            </Pressable>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centerContent: { justifyContent: "center", alignItems: "center", padding: 32 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, gap: 10 },
  backBtn: { minWidth: 44, minHeight: 44, justifyContent: "center" },
  headerTitle: { flex: 1, color: colors.white, fontSize: 17, fontWeight: "600" },

  preContent: { flex: 1, justifyContent: "center", padding: 28 },
  preIconWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.accentDim, justifyContent: "center", alignItems: "center", alignSelf: "center", marginBottom: 24 },
  preTitle: { color: colors.white, fontSize: 24, fontWeight: "700", textAlign: "center", marginBottom: 14 },
  preText: { color: colors.gray, fontSize: 15, lineHeight: 22, textAlign: "center", marginBottom: 24 },
  preBullets: { gap: 14, marginBottom: 20 },
  bullet: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  bulletText: { flex: 1, color: colors.gray, fontSize: 13, lineHeight: 19 },
  preFootnote: { color: colors.grayDark, fontSize: 11, textAlign: "center", marginBottom: 28, lineHeight: 16 },
  primaryBtn: { backgroundColor: colors.accent, borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 54 },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  laterBtn: { padding: 16, alignItems: "center" },
  laterText: { color: colors.gray, fontSize: 15 },

  loadingText: { color: colors.white, fontSize: 16, fontWeight: "600", marginTop: 20 },
  loadingSubText: { color: colors.gray, fontSize: 12, marginTop: 6 },

  resultBanner: { backgroundColor: colors.bgCard, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  resultCount: { color: colors.accent, fontSize: 14, fontWeight: "600" },

  emptyResult: { alignItems: "center", paddingTop: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 14 },
  emptyTitle: { color: colors.white, fontSize: 16, fontWeight: "700", marginBottom: 6 },
  emptyText: { color: colors.gray, fontSize: 14, textAlign: "center" },

  inviteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: colors.bgCard, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border, minHeight: 50 },
  inviteBtnText: { color: colors.accent, fontSize: 15, fontWeight: "600" },

  userRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.bgCard, borderRadius: 12, padding: 12, marginBottom: 8 },
  userAvatar: { width: 44, height: 44, borderRadius: 22 },
  userAvatarFallback: { backgroundColor: colors.accent, justifyContent: "center", alignItems: "center" },
  userInitial: { color: "#fff", fontWeight: "800", fontSize: 18 },
  userName: { color: colors.white, fontSize: 15, fontWeight: "600" },
  userHandle: { color: colors.gray, fontSize: 12 },
  followBtn: { backgroundColor: colors.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, minHeight: 36, justifyContent: "center" },
  followBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
