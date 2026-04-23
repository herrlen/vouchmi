import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Hook that tracks the iOS "Reduce Motion" accessibility setting.
 * When true, animations should be skipped or simplified.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);

    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => sub.remove();
  }, []);

  return reduceMotion;
}
