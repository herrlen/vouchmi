import { useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Modal, Animated, AccessibilityInfo } from "react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { colors } from "../constants/theme";
import { TIER_CONFIG } from "../constants/tiers";
import { useTierStore } from "../lib/tier-store";
import VSeal from "./VSeal";

export default function TierUpgradeModal() {
  const eligible = useTierStore((s) => s.eligibleForUpgrade);
  const dismiss = useTierStore((s) => s.dismissUpgradePrompt);
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (eligible) {
      Animated.spring(scale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }).start();
      AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
        if (!reduced) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      });
    } else {
      scale.setValue(0);
    }
  }, [eligible]);

  if (!eligible) return null;

  const config = TIER_CONFIG.bronze;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.handle} />

          <Animated.View style={[s.sealWrap, { transform: [{ scale }] }]}>
            <VSeal tier="bronze" size="lg" />
          </Animated.View>

          <Text style={s.headline}>Du hast das Bronze-V erreicht!</Text>
          <Text style={s.body}>
            Ab jetzt kannst du Empfehlungen monetarisieren, Brand-Anfragen erhalten und deine Performance tracken.
          </Text>

          <View style={s.benefits}>
            <BenefitRow emoji="📊" text="Creator Analytics — sieh wer deinen Empfehlungen folgt" />
            <BenefitRow emoji="🏢" text="Brand-Anfragen empfangen" />
            <BenefitRow emoji="💰" text="Höherer Affiliate-Anteil" />
          </View>

          <Pressable
            style={s.ctaBtn}
            onPress={() => {
              useTierStore.getState().dismissUpgradePrompt();
              router.push("/upgrade-confirm");
            }}
          >
            <Text style={s.ctaText}>Jetzt Influencer werden</Text>
          </Pressable>

          <Pressable style={s.laterBtn} onPress={dismiss}>
            <Text style={s.laterText}>Später erinnern</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function BenefitRow({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={s.benefitRow}>
      <Text style={s.benefitEmoji}>{emoji}</Text>
      <Text style={s.benefitText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.bgElevated, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, alignItems: "center" },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.grayDark, marginBottom: 24 },

  sealWrap: { marginBottom: 20 },
  headline: { color: colors.white, fontSize: 26, fontWeight: "800", textAlign: "center", marginBottom: 12 },
  body: { color: colors.gray, fontSize: 14, lineHeight: 21, textAlign: "center", marginBottom: 20, paddingHorizontal: 8 },

  benefits: { width: "100%", gap: 12, marginBottom: 24 },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.bgCard, borderRadius: 12, padding: 14 },
  benefitEmoji: { fontSize: 20 },
  benefitText: { color: colors.white, fontSize: 13, fontWeight: "500", flex: 1, lineHeight: 18 },

  ctaBtn: { backgroundColor: colors.accent, width: "100%", paddingVertical: 16, borderRadius: 14, alignItems: "center", minHeight: 56, justifyContent: "center" },
  ctaText: { color: colors.bg, fontSize: 16, fontWeight: "800" },

  laterBtn: { paddingVertical: 14, minHeight: 44 },
  laterText: { color: colors.gray, fontSize: 14, fontWeight: "500" },
});
