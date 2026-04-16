import { View, Text, StyleSheet } from "react-native";
import { colors } from "../constants/theme";
import { TIER_CONFIG, getNextTier, type Tier } from "../constants/tiers";

type Progress = { current: number; required: number; percent: number };

type Props = {
  tier: Tier;
  progressToNext: { followers: Progress; recommendations: Progress } | null;
  nextTier: Tier | null;
};

export default function TierProgressBar({ tier, progressToNext, nextTier }: Props) {
  if (!progressToNext || !nextTier) return null;

  const config = TIER_CONFIG[nextTier];
  const { followers, recommendations } = progressToNext;

  const fRemaining = Math.max(0, followers.required - followers.current);
  const rRemaining = Math.max(0, recommendations.required - recommendations.current);

  return (
    <View style={s.container}>
      <Text style={s.heading}>Fortschritt zu {config.label} {config.emoji}</Text>

      <View style={s.barGroup}>
        <View style={s.labelRow}>
          <Text style={s.label}>Follower</Text>
          <Text style={s.value}>{followers.current.toLocaleString("de-DE")} / {followers.required.toLocaleString("de-DE")}</Text>
        </View>
        <View style={s.track}>
          <View style={[s.fill, { width: `${Math.min(100, followers.percent)}%`, backgroundColor: config.color }]} />
        </View>
        {fRemaining > 0 && <Text style={s.hint}>Noch {fRemaining.toLocaleString("de-DE")} Follower</Text>}
      </View>

      <View style={s.barGroup}>
        <View style={s.labelRow}>
          <Text style={s.label}>Empfehlungen</Text>
          <Text style={s.value}>{recommendations.current} / {recommendations.required}</Text>
        </View>
        <View style={s.track}>
          <View style={[s.fill, { width: `${Math.min(100, recommendations.percent)}%`, backgroundColor: config.color }]} />
        </View>
        {rRemaining > 0 && <Text style={s.hint}>Noch {rRemaining} Empfehlungen</Text>}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  heading: { color: colors.white, fontSize: 14, fontWeight: "700" },
  barGroup: { gap: 4 },
  labelRow: { flexDirection: "row", justifyContent: "space-between" },
  label: { color: colors.gray, fontSize: 12, fontWeight: "600" },
  value: { color: colors.gray, fontSize: 12 },
  track: { height: 6, backgroundColor: colors.bgInput, borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
  hint: { color: colors.grayDark, fontSize: 11 },
});
