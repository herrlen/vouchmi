import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Switch, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { ChevronLeft, Shield, Lock, Ban, Crosshair, Download } from "lucide-react-native";
import { colors } from "../src/constants/theme";

export default function PrivacySettingsScreen() {
  const [profilePrivate, setProfilePrivate] = useState(false);
  const [twoFaActive, setTwoFaActive] = useState(true);
  const [thirdPartyData, setThirdPartyData] = useState(false);
  const [blockAnalytics, setBlockAnalytics] = useState(true);

  const requestDataExport = () => {
    Alert.alert(
      "Datenexport",
      "Wir stellen deine Daten zusammen und senden sie dir per E-Mail zu. Dies kann bis zu 48 Stunden dauern.",
      [
        { text: "Anfordern", onPress: () => Alert.alert("Angefordert", "Du erhältst eine E-Mail sobald dein Export bereit ist.") },
        { text: "Abbrechen", style: "cancel" },
      ]
    );
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
          <ChevronLeft color="#FFFFFF" size={24} strokeWidth={2} />
        </Pressable>
        <Text style={s.headerTitle}>Privatsphäre</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <Text style={s.subtitle}>Du bestimmst, was geteilt wird.</Text>

        {/* Shield hero */}
        <View style={s.shieldWrap}>
          <View style={s.shieldCircle}>
            <Shield color="#10B981" size={40} strokeWidth={2} fill="#10B981" />
          </View>
          <Text style={s.shieldText}>Dein Konto ist geschützt</Text>
        </View>

        {/* Toggle list */}
        <View style={s.list}>
          <ToggleRow
            icon={<View style={[s.iconBox, { backgroundColor: "#10B98118" }]}><Lock color="#10B981" size={18} strokeWidth={2.2} /></View>}
            title="Profil privat halten"
            desc="Nur Community-Mitglieder sehen deine Tipps"
            value={profilePrivate}
            onToggle={setProfilePrivate}
            activeColor="#10B981"
          />

          <ToggleRow
            icon={<View style={[s.iconBox, { backgroundColor: "#F59E0B18" }]}><Shield color="#F59E0B" size={18} strokeWidth={2.2} /></View>}
            title="Verifizierung (2FA)"
            desc="WhatsApp-Bestätigung aktiv"
            value={twoFaActive}
            onToggle={setTwoFaActive}
            activeColor="#10B981"
          />

          <ToggleRow
            icon={<View style={[s.iconBox, { backgroundColor: "#F472B618" }]}><Ban color="#F472B6" size={18} strokeWidth={2.2} /></View>}
            title="Daten an Dritte"
            desc="Deaktiviert — dauerhaft."
            value={thirdPartyData}
            onToggle={setThirdPartyData}
            activeColor="#10B981"
          />

          <ToggleRow
            icon={<View style={[s.iconBox, { backgroundColor: "#4F46E520" }]}><Crosshair color="#6366F1" size={18} strokeWidth={2.2} /></View>}
            title="Analytics blockieren"
            desc="Kein Third-Party Tracking"
            value={blockAnalytics}
            onToggle={setBlockAnalytics}
            activeColor="#10B981"
          />

          {/* Data export */}
          <Pressable style={s.row} onPress={requestDataExport}>
            <View style={[s.iconBox, { backgroundColor: "#F59E0B18" }]}>
              <Download color="#F59E0B" size={18} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>Daten herunterladen</Text>
              <Text style={s.rowDesc}>Alle deine Daten als ZIP — DSGVO-konform</Text>
            </View>
            <Text style={s.chevron}>›</Text>
          </Pressable>
        </View>

        {/* DSGVO badge */}
        <View style={s.dsgvoBox}>
          <Text style={s.dsgvoTitle}>DSGVO & Apple Privacy Label</Text>
          <Text style={s.dsgvoText}>Wir erheben nur, was wir brauchen.</Text>
          <Text style={s.dsgvoText}>Hosting in Deutschland. Keine Drittländer.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleRow({ icon, title, desc, value, onToggle, activeColor }: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  activeColor: string;
}) {
  return (
    <View style={s.row}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{title}</Text>
        <Text style={s.rowDesc}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "#2A2D3E", true: activeColor }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#2A2D3E"
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0E1A" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 8 },
  backBtn: { minWidth: 44, minHeight: 44, justifyContent: "center" },
  headerTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
  subtitle: { color: "#94A3B8", fontSize: 14, paddingHorizontal: 20, marginBottom: 20 },

  // Shield
  shieldWrap: { alignItems: "center", marginBottom: 24 },
  shieldCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#10B98118", justifyContent: "center", alignItems: "center", marginBottom: 12 },
  shieldText: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },

  // List
  list: { paddingHorizontal: 16, gap: 10 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: "#141926", borderRadius: 16, padding: 16, gap: 14 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  rowTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  rowDesc: { color: "#94A3B8", fontSize: 12, marginTop: 2 },
  chevron: { color: "#94A3B8", fontSize: 22 },

  // DSGVO
  dsgvoBox: { marginHorizontal: 16, marginTop: 24, backgroundColor: "#10B98110", borderWidth: 1, borderColor: "#10B98130", borderRadius: 16, padding: 18 },
  dsgvoTitle: { color: "#10B981", fontSize: 14, fontWeight: "700", marginBottom: 6 },
  dsgvoText: { color: "#CBD5E1", fontSize: 13, lineHeight: 20 },
});
