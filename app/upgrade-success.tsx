import { useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated, AccessibilityInfo } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import { colors } from "../src/constants/theme";
import VSeal from "../src/components/VSeal";

export default function UpgradeSuccessScreen() {
  const scale = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) {
        scale.setValue(1);
        fadeIn.setValue(1);
        return;
      }
      Animated.sequence([
        Animated.spring(scale, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }),
        Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
  }, []);

  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.content}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <VSeal tier="bronze" size="lg" />
        </Animated.View>

        <Animated.View style={{ opacity: fadeIn, alignItems: "center", gap: 12 }}>
          <Text style={s.headline}>Willkommen als{"\n"}Bronze-Creator!</Text>
          <Text style={s.emoji}>🥉</Text>
          <Text style={s.body}>
            Dein Profil hat jetzt das Bronze V-Siegel. Teile weiter Empfehlungen und baue deine Community aus, um Silber zu erreichen.
          </Text>
        </Animated.View>
      </View>

      <Animated.View style={[s.bottom, { opacity: fadeIn }]}>
        <Pressable style={s.ctaBtn} onPress={() => router.replace("/")}>
          <Text style={s.ctaText}>Los geht's</Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 24 },
  headline: { color: colors.white, fontSize: 28, fontWeight: "800", textAlign: "center", lineHeight: 36 },
  emoji: { fontSize: 48 },
  body: { color: colors.gray, fontSize: 14, lineHeight: 22, textAlign: "center" },
  bottom: { paddingHorizontal: 24, paddingBottom: 16 },
  ctaBtn: { backgroundColor: colors.accent, paddingVertical: 16, borderRadius: 14, alignItems: "center", minHeight: 56, justifyContent: "center" },
  ctaText: { color: colors.bg, fontSize: 16, fontWeight: "800" },
});
