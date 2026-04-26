import { View, Text, Pressable, StyleSheet, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
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

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.iconBtn} hitSlop={10} accessibilityRole="button" accessibilityLabel="Zurueck">
          <ChevronLeft color={colors.white} size={26} strokeWidth={2} />
        </Pressable>
        <Text style={s.title} accessibilityRole="header">Einstellungen</Text>
        <View style={s.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.section}>
          <Text style={s.sectionTitle}>Account</Text>
          <Button label="Profil bearbeiten" onPress={() => router.push("/profile-edit")} />
          <Button
            label={user?.phone_verified_at ? "Telefon verifiziert ✓" : "Telefon verifizieren"}
            onPress={() => router.push("/phone-verify")}
          />
          <Button label="Galerie-Layout" onPress={() => router.push("/layout-settings")} />
          <Button label="Abo verwalten" onPress={() => router.push("/subscription")} />
          <Row label="Username" value={user?.username ?? "-"} />
          <Row label="E-Mail" value={user?.email ?? "-"} />
        </View>

        {(user?.role === "influencer" || user?.role === "brand") && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Creator</Text>
            <Button label="Analytics & Dashboard" onPress={() => router.push("/analytics")} />
          </View>
        )}

        <View style={s.section}>
          <Text style={s.sectionTitle}>Social</Text>
          <Button label="Freunde einladen" onPress={() => router.push("/invite")} />
          <Button label="Freunde finden" onPress={() => router.push("/find-friends")} />
          <Button label="Meine Links" onPress={() => router.push("/links")} />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Sicherheit</Text>
          <Button label="Zwei-Faktor-Authentifizierung" onPress={() => router.push("/security")} />
          <Button label="Blockierte Nutzer" onPress={() => router.push("/blocked-users")} />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Datenschutz</Text>
          <Button label="Privatsphäre & Datenschutz" onPress={() => router.push("/privacy-settings")} />
          <Button label="Kontaktzugriff verwalten" onPress={() => router.push("/find-friends")} />
        </View>

        {user?.role === "brand" ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Brand</Text>
            <Button label="Brand-Abo verwalten" onPress={() => router.push("/brand")} />
          </View>
        ) : (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Marken</Text>
            <Button label="Brand-Profil aktivieren" onPress={() => router.push("/brand")} />
          </View>
        )}

        <View style={s.section}>
          <Text style={s.sectionTitle}>Rechtliches</Text>
          <Button label="Nutzungsbedingungen" onPress={() => router.push("/legal/terms")} />
          <Button label="Datenschutzerklärung" onPress={() => router.push("/legal/privacy")} />
          <Button label="Impressum" onPress={() => router.push("/legal/imprint")} />
          <View style={s.disclosureBox}>
            <Text style={s.disclosureTitle}>Transparenz</Text>
            <Text style={s.disclosureText}>
              Vouchmi hängt deinen Username an geteilte Links. Marken erkennen so, welcher Nutzer ihre Produkte am besten empfiehlt. Für dich entstehen keine Kosten.
            </Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Hilfe</Text>
          <Button label="Hilfe & FAQ" onPress={() => router.push("/help")} />
        </View>

        <View style={s.section}>
          <Button label="Abmelden" onPress={async () => { await logout(); router.replace("/auth"); }} />
          <Pressable style={s.deleteBtn} onPress={handleDelete} accessibilityRole="button" accessibilityLabel="Account loeschen" accessibilityHint="Loescht deinen Account unwiderruflich">
            <Text style={s.deleteText}>Account löschen</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

function Button({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={s.row} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.chevron} accessibilityElementsHidden>›</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
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
