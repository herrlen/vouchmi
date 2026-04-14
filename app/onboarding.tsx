import { useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, FlatList, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { colors } from "../src/constants/theme";

const { width } = Dimensions.get("window");

type Slide = {
  emoji: string;
  title: string;
  text: string;
};

const slides: Slide[] = [
  {
    emoji: "💡",
    title: "Du willst deiner Community zeigen, wo es die besten Produkte gibt?",
    text: "Auf Vouchmi teilst du Produkte, die du wirklich gut findest – mit den Menschen, denen du vertraust.",
  },
  {
    emoji: "⭐",
    title: "Du wirst automatisch zum Influencer, wenn du Produkte postest.",
    text: "Marken sehen, welche Empfehlungen ankommen. Daraus können echte Kooperationen entstehen.",
  },
  {
    emoji: "🛍️",
    title: "Du hast einen Onlineshop und willst deine Produkte mit der Community teilen?",
    text: "Eröffne ein Brand-Profil und erreiche genau die Communities, die zu deinen Produkten passen.",
  },
];

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const next = async () => {
    if (index < slides.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1 });
    } else {
      await SecureStore.setItemAsync("onboarding_done", "1");
      router.replace("/auth");
    }
  };

  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={[s.slide, { width }]}>
            <Text style={s.emoji}>{item.emoji}</Text>
            <Text style={s.title}>{item.title}</Text>
            <Text style={s.text}>{item.text}</Text>
          </View>
        )}
      />

      <View style={s.dots}>
        {slides.map((_, i) => (
          <View key={i} style={[s.dot, i === index && s.dotOn]} />
        ))}
      </View>

      <View style={s.footer}>
        <Pressable style={s.btn} onPress={next}>
          <Text style={s.btnText}>{index < slides.length - 1 ? "Weiter" : "Los geht's"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  slide: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emoji: { fontSize: 88, marginBottom: 30 },
  title: { color: colors.white, fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 14, lineHeight: 28 },
  text: { color: colors.gray, fontSize: 15, textAlign: "center", lineHeight: 23 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotOn: { backgroundColor: colors.accent, width: 22 },
  footer: { padding: 24 },
  btn: { backgroundColor: colors.accent, borderRadius: 14, padding: 16, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
