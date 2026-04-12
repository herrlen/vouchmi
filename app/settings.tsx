import { View, Text, Pressable, StyleSheet, Alert, ScrollView, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { colors } from "../src/constants/theme";
import { useAuth } from "../src/lib/store";
import { moderation } from "../src/lib/api";

export default function SettingsScreen() {
  const { user, logout } = useAuth();

  const handleDelete = () => {
    Alert.alert(
      "Account wirklich löschen?",
      "Diese Aktion kann nicht rückgängig gemacht werden. Alle deine Posts, Kommentare, Nachrichten und Community-Mitgliedschaften werden gelöscht.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Endgültig löschen",
          style: "destructive",
          onPress: async () => {
            try {
              await moderation.deleteAccount();
              await logout();
              router.replace("/auth");
            } catch (e: any) {
              Alert.alert("Fehler", e.message);
            }
          },
        },
      ],
    );
  };

  const openUrl = (url: string) => Linking.openURL(url).catch(() => {});

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={s.back}>‹ Zurück</Text>
        </Pressable>
        <Text style={s.title}>Einstellungen</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.section}>
          <Text style={s.sectionTitle}>Account</Text>
          <Button label="Profil bearbeiten" onPress={() => router.push("/profile-edit")} />
          <Row label="Username" value={user?.username ?? "-"} />
          <Row label="E-Mail" value={user?.email ?? "-"} />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Social</Text>
          <Button label="Freunde einladen" onPress={() => router.push("/invite")} />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Sicherheit & Moderation</Text>
          <Button label="Blockierte Nutzer" onPress={() => router.push("/blocked-users")} />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Marken</Text>
          <Button label="Brand-Profil" onPress={() => router.push("/brand")} />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Rechtliches</Text>
          <Button label="Nutzungsbedingungen" onPress={() => openUrl("https://truscart.com/terms")} />
          <Button label="Datenschutzerklärung" onPress={() => openUrl("https://truscart.com/privacy")} />
          <Button label="Impressum" onPress={() => openUrl("https://truscart.com/imprint")} />
          <View style={s.disclosureBox}>
            <Text style={s.disclosureTitle}>Transparenz</Text>
            <Text style={s.disclosureText}>
              TrusCart hängt deinen Username an geteilte Links. Marken erkennen so, welcher Nutzer ihre Produkte am besten empfiehlt. Für dich entstehen keine Kosten.
            </Text>
          </View>
        </View>

        <View style={s.section}>
          <Button label="Abmelden" onPress={async () => { await logout(); router.replace("/auth"); }} />
          <Pressable style={s.deleteBtn} onPress={handleDelete}>
            <Text style={s.deleteText}>Account löschen</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

function Button({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={s.row} onPress={onPress}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.chevron}>›</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  back: { color: colors.accent, fontSize: 16, width: 60 },
  title: { color: colors.white, fontSize: 18, fontWeight: "600" },
  content: { padding: 16, paddingBottom: 60 },
  section: { marginBottom: 28 },
  sectionTitle: { color: colors.grayDark, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.bgCard, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, marginBottom: 6 },
  rowLabel: { color: colors.white, fontSize: 15 },
  rowValue: { color: colors.gray, fontSize: 15 },
  chevron: { color: colors.gray, fontSize: 20 },
  deleteBtn: { padding: 14, alignItems: "center", marginTop: 8 },
  deleteText: { color: "#EF4444", fontSize: 15 },
  disclosureBox: { backgroundColor: colors.bgCard, padding: 14, borderRadius: 12, marginTop: 6 },
  disclosureTitle: { color: colors.white, fontSize: 13, fontWeight: "600", marginBottom: 4 },
  disclosureText: { color: colors.gray, fontSize: 12, lineHeight: 18 },
});
