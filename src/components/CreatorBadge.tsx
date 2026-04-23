import { View, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from "react-native-reanimated";
import { useEffect } from "react";
import { Star } from "lucide-react-native";

const SIZES = {
  sm: { container: 14, icon: 8, shadow: 2 },
  md: { container: 20, icon: 12, shadow: 3 },
  lg: { container: 28, icon: 16, shadow: 4 },
} as const;

type BadgeSize = keyof typeof SIZES;

interface CreatorBadgeProps {
  size?: BadgeSize;
  animate?: boolean;
}

export default function CreatorBadge({ size = "sm", animate = false }: CreatorBadgeProps) {
  const dim = SIZES[size];
  const scale = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (animate) {
      scale.value = withSpring(1, { damping: 12, stiffness: 180 });
    }
  }, [animate, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        s.badge,
        {
          width: dim.container,
          height: dim.container,
          borderRadius: dim.container / 2,
          shadowOffset: { width: 0, height: dim.shadow / 2 },
          shadowRadius: dim.shadow,
        },
        animatedStyle,
      ]}
      accessibilityLabel="Verifizierter Creator"
      accessibilityRole="image"
    >
      <Star
        color="#FFFFFF"
        fill="#FFFFFF"
        size={dim.icon}
        strokeWidth={2}
      />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  badge: {
    backgroundColor: "#F472B6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "rgba(244, 114, 182, 0.3)",
    shadowOpacity: 1,
    elevation: 3,
  },
});
