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

  return (
    <View style={s.wrap}>
      <Pressable
        style={({ pressed }) => [s.fab, pressed && { opacity: 0.85, transform: [{ scale: 0.94 }] }]}
        onPress={() => setSheetOpen(true)}
      >
        <Plus color="#fff" size={28} strokeWidth={2.6} />
      </Pressable>
      <View style={s.bar}>
        {tabs.map(({ name, label, Icon }) => (
          <Pressable key={name} style={s.tab} onPress={() => router.replace(`/${name}`)} hitSlop={4}>
            <Icon color={colors.tabInactive} size={22} strokeWidth={1.8} />
            <Text style={s.label}>{label}</Text>
          </Pressable>
        ))}
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
  fab: {
    position: "absolute",
    alignSelf: "center",
    top: -20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
});
