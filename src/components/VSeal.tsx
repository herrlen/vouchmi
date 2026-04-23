import { View, Text, StyleSheet } from "react-native";
import { TIER_CONFIG, type Tier } from "../constants/tiers";

type SizeConfig = { outer: number; inner: number; fontSize: number; borderWidth: number };

const SIZES: Record<string, SizeConfig> = {
  xs: { outer: 16, inner: 10, fontSize: 6, borderWidth: 1.5 },
  sm: { outer: 22, inner: 14, fontSize: 8, borderWidth: 2 },
  md: { outer: 30, inner: 20, fontSize: 10, borderWidth: 2.5 },
  lg: { outer: 40, inner: 28, fontSize: 14, borderWidth: 3 },
};

type Props = {
  tier: Tier;
  opacity?: number;
  size?: "xs" | "sm" | "md" | "lg";
  showLabel?: boolean;
};

export default function VSeal({ tier, opacity = 1, size = "sm", showLabel = false }: Props) {
  if (tier === "none") return null;

  const config = TIER_CONFIG[tier];
  const s = SIZES[size];

  const badge = (
    <View
      style={[
        styles.outer,
        {
          width: s.outer,
          height: s.outer,
          borderRadius: s.outer / 2,
          borderWidth: s.borderWidth,
          borderColor: config.color,
          opacity,
        },
      ]}
      accessibilityLabel={`${config.label} Verifiziert`}
      accessibilityRole="image"
    >
      <View
        style={[
          styles.inner,
          {
            width: s.inner,
            height: s.inner,
            borderRadius: s.inner / 2,
            backgroundColor: config.color,
          },
        ]}
      >
        <Text style={[styles.v, { fontSize: s.fontSize }]}>V</Text>
      </View>
    </View>
  );

  if (!showLabel) return badge;

  return (
    <View style={styles.labelRow}>
      {badge}
      <Text style={[styles.labelText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  inner: {
    justifyContent: "center",
    alignItems: "center",
  },
  v: {
    color: "#fff",
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  labelText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
