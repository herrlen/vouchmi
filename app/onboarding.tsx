import { useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  Dimensions,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Users, Sparkles, Store, ArrowRight } from "lucide-react-native";
import { colors } from "../src/constants/theme";
import { useReduceMotion } from "../src/hooks/useReduceMotion";

const { width } = Dimensions.get("window");

type Slide = {
  icon: (c: string) => React.ReactNode;
  accent: string;
  headline: string;
  body: string;
};

const slides: Slide[] = [
  {
    icon: (c) => <Users color={c} size={44} strokeWidth={1.8} />,
    accent: "#F472B6",
    headline: "Deine Community.\nDein Vorteil.",
    body: "Tritt Communities bei, die zu dir passen. Entdecke Geheimtipps, bevor sie viral gehen — empfohlen von Menschen, denen du vertraust.",
  },
  {
    icon: (c) => <Sparkles color={c} size={44} strokeWidth={1.8} />,
    accent: "#10B981",
    headline: "Empfehle & werde\nentdeckt.",
    body: "Jede Empfehlung in deiner Community macht dich sichtbar. Dein Profil-Link wird automatisch geteilt — und mit etwas Glück wirst du von Marken entdeckt.",
  },
  {
    icon: (c) => <Store color={c} size={44} strokeWidth={1.8} />,
    accent: "#4F46E5",
    headline: "Deine Brand.\nDeine Community.",
    body: "Du hast ein eigenes Unternehmen und möchtest deine Produkte empfehlen? Die Community wartet auf dich.",
  },
];

export default function OnboardingScreen() {
  const [slideIndex, setSlideIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const reduceMotion = useReduceMotion();

  const finish = async () => {
    await SecureStore.setItemAsync("onboarding_done", "1");
    router.replace("/auth");
  };

  const nextSlide = () => {
    if (slideIndex < slides.length - 1) {
      listRef.current?.scrollToIndex({ index: slideIndex + 1 });
    } else {
      finish();
    }
  };

  const slide = slides[slideIndex];
  const isLast = slideIndex === slides.length - 1;

  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      <View style={s.topRow}>
        <View style={{ width: 80 }} />
        <Pressable onPress={finish} hitSlop={10} style={s.skipBtn} accessibilityRole="button" accessibilityLabel="Einführung überspringen">
          <Text style={s.skipText}>Überspringen</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setSlideIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index }) => (
          <View style={[s.slide, { width }]} accessibilityRole="summary" accessibilityLabel={`Schritt ${index + 1} von ${slides.length}: ${item.headline.replace("\n", " ")}. ${item.body}`}>
            <View style={[s.iconBubble, { backgroundColor: item.accent + "22" }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {item.icon(item.accent)}
            </View>
            <Text style={s.headline}>{item.headline}</Text>
            <ScrollView style={{ maxHeight: 200 }}>
              <Text style={s.body}>{item.body}</Text>
            </ScrollView>
          </View>
        )}
      />

      <View style={s.bottom}>
        <View style={s.dots} accessibilityRole="tablist" accessibilityLabel={`Seite ${slideIndex + 1} von ${slides.length}`}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                s.dot,
                i === slideIndex && {
                  width: reduceMotion ? 12 : 28,
                  backgroundColor: slide.accent,
                },
              ]}
              accessibilityElementsHidden
            />
          ))}
        </View>
        <Pressable
          style={[s.cta, { backgroundColor: isLast ? "#10B981" : slide.accent }]}
          onPress={nextSlide}
          accessibilityRole="button"
          accessibilityLabel={isLast ? "Los geht's — zur Anmeldung" : `Weiter zu Schritt ${slideIndex + 2}`}
        >
          <Text style={s.ctaText}>{isLast ? "Los geht's" : "Weiter"}</Text>
          <ArrowRight color="#fff" size={18} strokeWidth={2.2} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 4 },
  skipBtn: { padding: 8 },
  skipText: { color: colors.gray, fontSize: 13, fontWeight: "500" },
  slide: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 36 },
  iconBubble: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", marginBottom: 28 },
  headline: { color: colors.white, fontSize: 28, fontWeight: "800", textAlign: "center", lineHeight: 34, letterSpacing: -0.4, marginBottom: 14 },
  body: { color: colors.gray, fontSize: 15, lineHeight: 23, textAlign: "center", maxWidth: 300 },

  bottom: { paddingHorizontal: 36, paddingBottom: 16, gap: 18, alignItems: "center" },
  dots: { flexDirection: "row", gap: 8, alignItems: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", height: 52, borderRadius: 16 },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
});
