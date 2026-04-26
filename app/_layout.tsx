// app/_layout.tsx
import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppState } from "react-native";
import { ShareIntentProvider, useShareIntent } from "expo-share-intent";
import { useAuth } from "../src/lib/store";
import { useProfileMode } from "../src/lib/profile-mode";
import { useTierStore } from "../src/lib/tier-store";
import { useSharePending } from "../src/lib/share-pending-store";
import TierUpgradeModal from "../src/components/TierUpgradeModal";
import { syncDailyRecommendation } from "../src/lib/widget-sync";
import { colors } from "../src/constants/theme";

function RootLayout() {
  const init = useAuth((s) => s.init);
  const user = useAuth((s) => s.user);
  const initProfileMode = useProfileMode((s) => s.init);
  const fetchTier = useTierStore((s) => s.fetchTierStatus);
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

  useEffect(() => { init(); }, []);
  useEffect(() => {
    if (user) {
      initProfileMode();
      fetchTier();
      syncDailyRecommendation();
    }
  }, [user]);

  // Sync widget when app comes to foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && user) syncDailyRecommendation();
    });
    return () => sub.remove();
  }, [user]);

  // Handle share intent
  useEffect(() => {
    if (hasShareIntent && shareIntent) {
      const url = shareIntent.webUrl ?? shareIntent.text ?? "";
      if (url) {
        resetShareIntent();
        if (user) {
          router.push({ pathname: "/share/create", params: { url } });
        } else {
          useSharePending.getState().setPendingUrl(url);
          router.push("/auth");
        }
      }
    }
  }, [hasShareIntent, shareIntent, user]);

  // After login, check for pending share
  useEffect(() => {
    if (user) {
      const pending = useSharePending.getState().pendingUrl;
      if (pending) {
        router.push({ pathname: "/share/create", params: { url: pending } });
      }
    }
  }, [user]);

  return (
    <>
      <StatusBar style="light" />
      <TierUpgradeModal />
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
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
        <Stack.Screen name="verify-email" options={{ headerShown: false }} />
        <Stack.Screen name="links/index" options={{ headerShown: false }} />
        <Stack.Screen name="links/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="create-community" options={{ title: "Neue Community", presentation: "modal" }} />
        <Stack.Screen name="create-post" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="discover" options={{ title: "Entdecken" }} />
        <Stack.Screen name="community/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="community-settings" options={{ headerShown: false }} />
        <Stack.Screen name="post/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="profile-edit" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="blocked-users" options={{ headerShown: false }} />
        <Stack.Screen name="brand" options={{ headerShown: false }} />
        <Stack.Screen name="brand/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="invite" options={{ headerShown: false }} />
        <Stack.Screen name="user/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="security" options={{ headerShown: false }} />
        <Stack.Screen name="find-friends" options={{ headerShown: false }} />
        <Stack.Screen name="layout-settings" options={{ headerShown: false }} />
        <Stack.Screen name="help" options={{ headerShown: false }} />
        <Stack.Screen name="analytics" options={{ headerShown: false }} />
        <Stack.Screen name="privacy-settings" options={{ headerShown: false }} />
        <Stack.Screen name="upgrade-confirm" options={{ headerShown: false }} />
        <Stack.Screen name="upgrade-success" options={{ headerShown: false }} />
        <Stack.Screen name="brand-register" options={{ headerShown: false }} />
        <Stack.Screen name="brand-return" options={{ headerShown: false }} />
        <Stack.Screen name="influencer-register" options={{ headerShown: false }} />
        <Stack.Screen name="influencer-return" options={{ headerShown: false }} />
        <Stack.Screen name="subscription" options={{ headerShown: false }} />
        <Stack.Screen name="messages/[userId]" options={{ headerShown: false }} />
        <Stack.Screen name="share/create" options={{ headerShown: false, presentation: "modal" }} />
      </Stack>
    </>
  );
}

export default function Layout() {
  return (
    <ShareIntentProvider>
      <RootLayout />
    </ShareIntentProvider>
  );
}
