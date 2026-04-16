import { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { colors } from "../src/constants/theme";
import { tier as tierApi } from "../src/lib/api";
import { useTierStore } from "../src/lib/tier-store";
import { useAuth } from "../src/lib/store";
import VSeal from "../src/components/VSeal";

export default function UpgradeConfirmScreen() {
  const [loading, setLoading] = useState(false);

  const onUpgrade = async () => {
    setLoading(true);
    try {
      await tierApi.upgradeToInfluencer();
      await useTierStore.getState().fetchTierStatus();
      // Refresh user data to get updated role
      await useAuth.getState().init();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/upgrade-success");
    } catch (e: any) {
      Alert.alert("Fehler", e.message ?? "Upgrade fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.iconBtn} hitSlop={10}>
          <ChevronLeft color={colors.white} size={26} strokeWidth={2} />
        </Pressable>
        <Text style={s.title}>Influencer werden</Text>
        <View style={s.iconBtn} />
      </View>

      <View style={s.content}>
        <VSeal tier="bronze" size="lg" />
        <Text style={s.headline}>Bereit zum Aufstieg?</Text>
        <Text style={s.body}>
          Du wirst zum Bronze-Creator. Dein Profil erhält das V-Siegel und du bekommst Zugang zu Creator-Features.
        </Text>

        <View style={s.infoBox}>
          <Text style={s.infoTitle}>Was sich ändert</Text>
          <Text style={s.infoItem}>• Deine Rolle wird zu "Influencer"</Text>
          <Text style={s.infoItem}>• Bronze V-Siegel auf deinem Profil</Text>
          <Text style={s.infoItem}>• Zugang zu Creator Analytics</Text>
          <Text style={s.infoItem}>• Brand-Anfragen empfangen</Text>
        </View>

        <Pressable style={[s.ctaBtn, loading && { opacity: 0.6 }]} onPress={onUpgrade} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={s.ctaText}>Jetzt upgraden</Text>
          )}
        </Pressable>

        <Pressable style={s.cancelBtn} onPress={() => router.back()}>
          <Text style={s.cancelText}>Abbrechen</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { color: colors.white, fontSize: 18, fontWeight: "700" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 16 },
  headline: { color: colors.white, fontSize: 26, fontWeight: "800", textAlign: "center" },
  body: { color: colors.gray, fontSize: 14, lineHeight: 21, textAlign: "center" },
  infoBox: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, width: "100%", gap: 6 },
  infoTitle: { color: colors.white, fontSize: 15, fontWeight: "700", marginBottom: 4 },
  infoItem: { color: colors.gray, fontSize: 13, lineHeight: 20 },
  ctaBtn: { backgroundColor: colors.accent, width: "100%", paddingVertical: 16, borderRadius: 14, alignItems: "center", minHeight: 56, justifyContent: "center" },
  ctaText: { color: colors.bg, fontSize: 16, fontWeight: "800" },
  cancelBtn: { paddingVertical: 14, minHeight: 44 },
  cancelText: { color: colors.gray, fontSize: 14, fontWeight: "500" },
});
