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
};

export default function VSeal({ tier, opacity = 1, size = "sm" }: Props) {
  if (tier === "none") return null;

  const config = TIER_CONFIG[tier];
  const s = SIZES[size];

  return (
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
      accessibilityLabel={`${config.label} Creator Siegel`}
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
});
