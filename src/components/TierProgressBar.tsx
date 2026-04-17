import { useState } from "react";
import { View, Text, Pressable, StyleSheet, LayoutAnimation, Platform, UIManager } from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { TIER_CONFIG, type Tier } from "../constants/tiers";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Progress = { current: number; required: number; percent: number };

type Props = {
  tier: Tier;
  progressToNext: { followers: Progress; recommendations: Progress } | null;
  nextTier: Tier | null;
};

export default function TierProgressBar({ tier, progressToNext, nextTier }: Props) {
  const [open, setOpen] = useState(false);

  if (!progressToNext || !nextTier) return null;

  const config = TIER_CONFIG[nextTier];
  const { followers, recommendations } = progressToNext;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <View style={s.container}>
      <Pressable style={s.header} onPress={toggle} hitSlop={6}>
        <Text style={s.heading}>Fortschritt zu {config.label} {config.emoji}</Text>
        {open ? (
          <ChevronUp color="#64748B" size={18} strokeWidth={2} />
        ) : (
          <ChevronDown color="#64748B" size={18} strokeWidth={2} />
        )}
      </Pressable>

      {open && (
        <View style={s.content}>
          <View style={s.barGroup}>
            <View style={s.labelRow}>
              <Text style={s.label}>Follower</Text>
              <Text style={s.value}>{followers.current.toLocaleString("de-DE")} / {followers.required.toLocaleString("de-DE")}</Text>
            </View>
            <View style={s.track}>
              <View style={[s.fill, { width: `${Math.min(100, followers.percent)}%`, backgroundColor: config.color }]} />
            </View>
            {followers.current < followers.required && (
              <Text style={s.hint}>Noch {(followers.required - followers.current).toLocaleString("de-DE")} Follower</Text>
            )}
          </View>

          <View style={s.barGroup}>
            <View style={s.labelRow}>
              <Text style={s.label}>Empfehlungen</Text>
              <Text style={s.value}>{recommendations.current} / {recommendations.required}</Text>
            </View>
            <View style={s.track}>
              <View style={[s.fill, { width: `${Math.min(100, recommendations.percent)}%`, backgroundColor: config.color }]} />
            </View>
            {recommendations.current < recommendations.required && (
              <Text style={s.hint}>Noch {recommendations.required - recommendations.current} Empfehlungen</Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginHorizontal: 20, marginTop: 14, backgroundColor: "#141926", borderRadius: 20, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, minHeight: 48 },
  heading: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  content: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  barGroup: { gap: 4 },
  labelRow: { flexDirection: "row", justifyContent: "space-between" },
  label: { color: "#94A3B8", fontSize: 12, fontWeight: "600" },
  value: { color: "#64748B", fontSize: 12 },
  track: { height: 6, backgroundColor: "#1E2235", borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
  hint: { color: "#4A5068", fontSize: 11 },
});
