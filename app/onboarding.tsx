import { useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, FlatList, Dimensions, Linking } from "react-native";
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
    emoji: "🛒",
    title: "Empfehlungen unter Freunden",
    text: "Vouchmi ist dein Community-Ort für Shopping-Tipps. Teile Produkte, die du wirklich gut findest – in deiner eigenen Gruppe.",
  },
  {
    emoji: "🔗",
    title: "Transparentes Promoter-Tracking",
    text: "Wenn du einen Link teilst, hängt Vouchmi deinen Usernamen dran. So sehen Marken, welcher Nutzer ihre Produkte am besten empfiehlt – du kannst dich dann direkt bei Marken bewerben.",
  },
  {
    emoji: "🤝",
    title: "Sicher & fair",
    text: "Keine Amazon-Links, keine anonymen Tracker. Alles läuft offen, DSGVO-konform und ohne versteckte Affiliate-Werbung.",
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
        <Text style={s.legal}>
          Mit „Weiter" stimmst du unseren{" "}
          <Text style={s.link} onPress={() => Linking.openURL("https://vouchmi.com/terms")}>
            Nutzungsbedingungen
          </Text>
          {" "}und der{" "}
          <Text style={s.link} onPress={() => Linking.openURL("https://vouchmi.com/privacy")}>
            Datenschutzerklärung
          </Text>
          {" "}zu.
        </Text>
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
  title: { color: colors.white, fontSize: 26, fontWeight: "700", textAlign: "center", marginBottom: 14 },
  text: { color: colors.gray, fontSize: 15, textAlign: "center", lineHeight: 23 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotOn: { backgroundColor: colors.accent, width: 22 },
  footer: { padding: 24 },
  legal: { color: colors.grayDark, fontSize: 11, textAlign: "center", marginBottom: 14, lineHeight: 16 },
  link: { color: colors.accent, textDecorationLine: "underline" },
  btn: { backgroundColor: colors.accent, borderRadius: 14, padding: 16, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
