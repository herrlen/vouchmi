import { useState } from "react";
import { Tabs } from "expo-router";
import { Compass, Search, Users, User, Plus } from "lucide-react-native";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { colors } from "../../src/constants/theme";
import CreateSheet from "../../src/components/CreateSheet";

export default function TabsLayout() {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.tabActive,
          tabBarInactiveTintColor: colors.tabInactive,
          tabBarStyle: {
            backgroundColor: colors.bgElevated,
            borderTopColor: colors.border,
            borderTopWidth: 0.5,
            height: Platform.OS === "ios" ? 84 : 64,
            paddingBottom: Platform.OS === "ios" ? 28 : 10,
            paddingTop: 8,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: "500", marginTop: 2 },
          tabBarItemStyle: { paddingVertical: 4 },
        }}
      >
        <Tabs.Screen name="search" options={{ title: "Suche", tabBarIcon: ({ color, size }) => <Search color={color} size={size} strokeWidth={1.8} /> }} />
        <Tabs.Screen name="communities" options={{ title: "Community", tabBarIcon: ({ color, size }) => <Users color={color} size={size} strokeWidth={1.8} /> }} />
        <Tabs.Screen name="reco" options={{ title: "Reco", tabBarIcon: ({ color, size }) => <Compass color={color} size={size} strokeWidth={1.8} /> }} />
        <Tabs.Screen name="profile" options={{ title: "Profil", tabBarIcon: ({ color, size }) => <User color={color} size={size} strokeWidth={1.8} /> }} />
      </Tabs>

      <Pressable
        style={({ pressed }) => [s.fab, pressed && { opacity: 0.85, transform: [{ scale: 0.94 }] }]}
        onPress={() => setSheetOpen(true)}
        accessibilityLabel="Neuen Beitrag erstellen"
      >
        <Plus color="#fff" size={30} strokeWidth={2.6} />
      </Pressable>

      <CreateSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </View>
  );
}

const TAB_H = Platform.OS === "ios" ? 84 : 64;

const s = StyleSheet.create({
  fab: {
    position: "absolute",
    alignSelf: "center",
    bottom: TAB_H - 20,
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
