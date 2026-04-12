import { Tabs, router } from "expo-router";
import { Home, Search, Users, User, Plus } from "lucide-react-native";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { colors } from "../../src/constants/theme";

export default function TabsLayout() {
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
        <Tabs.Screen
          name="search"
          options={{
            title: "Suche",
            tabBarIcon: ({ color, size }) => <Search color={color} size={size} strokeWidth={2} />,
          }}
        />
        <Tabs.Screen
          name="communities"
          options={{
            title: "Community",
            tabBarIcon: ({ color, size }) => <Users color={color} size={size} strokeWidth={2} />,
          }}
        />
        <Tabs.Screen
          name="feed"
          options={{
            title: "Feed",
            tabBarIcon: ({ color, size }) => <Home color={color} size={size} strokeWidth={2} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profil",
            tabBarIcon: ({ color, size }) => <User color={color} size={size} strokeWidth={2} />,
          }}
        />
      </Tabs>

      <Pressable
        style={({ pressed }) => [s.fab, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}
        onPress={() => router.push("/create-post")}
        hitSlop={10}
        accessibilityLabel="Produkt teilen"
        accessibilityRole="button"
      >
        <Plus color={colors.bg} size={28} strokeWidth={2.8} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 18,
    bottom: Platform.OS === "ios" ? 100 : 80,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
});
