import { useState } from "react";
import { View, Pressable, StyleSheet, Platform, Text } from "react-native";
import { router } from "expo-router";
import { Search, Users, Compass, User, Plus } from "lucide-react-native";
import { colors } from "../constants/theme";
import CreateSheet from "./CreateSheet";

const tabs = [
  { name: "search", label: "Suche", Icon: Search },
  { name: "communities", label: "Community", Icon: Users },
  { name: "reco", label: "Reco", Icon: Compass },
  { name: "profile", label: "Profil", Icon: User },
] as const;

export default function BottomBar({ communityId }: { communityId?: string }) {
  const [sheetOpen, setSheetOpen] = useState(false);

  // Damit der "+"-Button optisch identisch zur (tabs)-Layout-FAB sitzt:
  // 48×48 mittig in der Leiste (nicht pop-out). Wir rendern den FAB-Cell
  // zwischen "communities" und "reco", genau wie im Tab-Layout.
  const renderTabCell = (t: typeof tabs[number]) => (
    <Pressable key={t.name} style={s.tab} onPress={() => router.replace(`/${t.name}`)} hitSlop={4}>
      <t.Icon color={colors.tabInactive} size={22} strokeWidth={1.8} />
      <Text style={s.label}>{t.label}</Text>
    </Pressable>
  );

  return (
    <View style={s.wrap}>
      <View style={s.bar}>
        {renderTabCell(tabs[0])}
        {renderTabCell(tabs[1])}
        <Pressable
          style={({ pressed }) => [s.fabCell, pressed && { opacity: 0.85 }]}
          onPress={() => setSheetOpen(true)}
          accessibilityLabel="Neuen Beitrag erstellen"
          accessibilityRole="button"
        >
          <View style={s.fabCircle}>
            <Plus color="#fff" size={28} strokeWidth={2.8} />
          </View>
        </Pressable>
        {renderTabCell(tabs[2])}
        {renderTabCell(tabs[3])}
      </View>
      <CreateSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} communityId={communityId} />
    </View>
  );
}

const TAB_H = Platform.OS === "ios" ? 84 : 64;

const s = StyleSheet.create({
  wrap: { position: "relative" },
  bar: {
    flexDirection: "row",
    backgroundColor: colors.bgElevated,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    height: TAB_H,
    paddingBottom: Platform.OS === "ios" ? 28 : 10,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2, minHeight: 44 },
  label: { color: colors.tabInactive, fontSize: 11, fontWeight: "500" },
  fabCell: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 4 },
  fabCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
});
