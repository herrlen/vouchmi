// app/index.tsx — Routing-Weiche
import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "../src/lib/store";
import { colors } from "../src/constants/theme";

export default function Gate() {
  const { user, isLoading } = useAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync("onboarding_done").then((v) => {
      setNeedsOnboarding(!v);
      setOnboardingChecked(true);
    });
  }, []);

  if (isLoading || !onboardingChecked) {
    return (
      <View style={s.center}>
        <Text style={s.logo}>Vouchmi</Text>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
      </View>
    );
  }
  if (needsOnboarding) return <Redirect href="/onboarding" />;
  if (!user) return <Redirect href="/auth" />;
  return <Redirect href="/reco" />;
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" },
  logo: { color: colors.accent, fontSize: 42, fontWeight: "900", letterSpacing: -1 },
});
