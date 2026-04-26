import { Tabs, router } from "expo-router";
import { Compass, Search, Users, User, Plus } from "lucide-react-native";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { colors } from "../../src/constants/theme";
import { useScrollStore } from "../../src/lib/scroll-store";

export default function TabsLayout() {
  return (
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
      <Tabs.Screen
        name="communities"
        options={{ title: "Community", tabBarIcon: ({ color, size }) => <Users color={color} size={size} strokeWidth={1.8} /> }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (navigation.isFocused()) {
              e.preventDefault();
              useScrollStore.getState().triggerScrollToTopCommunities();
            }
          },
        })}
      />
      <Tabs.Screen name="messages" options={{ href: null }} />
      <Tabs.Screen
        name="post"
        options={{
          title: "",
          tabBarLabel: () => null,
          tabBarIcon: () => null,
          tabBarButton: (props) => (
            <Pressable
              {...props}
              onPress={() => router.push("/create-post")}
              accessibilityLabel="Neuen Beitrag erstellen"
              accessibilityRole="button"
              style={s.fabCell}
            >
              <View style={s.fabCircle}>
                <Plus color="#fff" size={28} strokeWidth={2.8} />
              </View>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="reco"
        options={{ title: "Reco", tabBarIcon: ({ color, size }) => <Compass color={color} size={size} strokeWidth={1.8} /> }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (navigation.isFocused()) {
              e.preventDefault();
              useScrollStore.getState().triggerScrollToTopReco();
            }
          },
        })}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profil", tabBarIcon: ({ color, size }) => <User color={color} size={size} strokeWidth={1.8} /> }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (navigation.isFocused()) {
              e.preventDefault();
              useScrollStore.getState().triggerScrollToTopProfile();
            }
          },
        })}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  fabCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
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
