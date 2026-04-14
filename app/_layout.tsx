// app/_layout.tsx
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../src/lib/store";
import { useProfileMode } from "../src/lib/profile-mode";
import { colors } from "../src/constants/theme";

export default function Layout() {
  const init = useAuth((s) => s.init);
  const user = useAuth((s) => s.user);
  const initProfileMode = useProfileMode((s) => s.init);
  useEffect(() => { init(); }, []);
  useEffect(() => { if (user) initProfileMode(); }, [user]);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.accent,
        headerTitleStyle: { fontWeight: "bold", color: colors.white },
        contentStyle: { backgroundColor: colors.bg },
      }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ title: "Einloggen", headerShown: false }} />
        <Stack.Screen name="create-community" options={{ title: "Neue Community", presentation: "modal" }} />
        <Stack.Screen name="create-post" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="create-story" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="discover" options={{ title: "Entdecken" }} />
        <Stack.Screen name="community/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="community-settings" options={{ headerShown: false }} />
        <Stack.Screen name="post/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="profile-edit" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="blocked-users" options={{ headerShown: false }} />
        <Stack.Screen name="brand" options={{ headerShown: false }} />
        <Stack.Screen name="invite" options={{ headerShown: false }} />
        <Stack.Screen name="user/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="security" options={{ headerShown: false }} />
        <Stack.Screen name="find-friends" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
