import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { colors } from "../constants/theme";

type Loader = () => Promise<{ title: string; updated_at: string; content: string }>;

/**
 * Generischer Renderer für die Legal-Screens.
 * Erwartet Markdown-ähnlichen Text aus dem Backend und rendert Headings (#, ##)
 * und Absätze. Bewusst kein vollständiger Markdown-Parser — die Texte sind
 * redaktionell kontrolliert.
 */
export default function LegalScreen({ load }: { load: Loader }) {
  const [data, setData] = useState<{ title: string; updated_at: string; content: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load()
      .then(setData)
      .catch((e) => setError(e.message ?? "Konnte Inhalt nicht laden."));
  }, [load]);

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.iconBtn} hitSlop={10}>
          <ChevronLeft color={colors.white} size={26} strokeWidth={2} />
        </Pressable>
        <Text style={s.title} numberOfLines={1}>{data?.title ?? "…"}</Text>
        <View style={s.iconBtn} />
      </View>

      {error ? (
        <View style={s.center}><Text style={s.error}>{error}</Text></View>
      ) : !data ? (
        <View style={s.center}><ActivityIndicator color={colors.accent} /></View>
      ) : (
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.meta}>Stand: {data.updated_at}</Text>
          {renderBlocks(data.content)}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function renderBlocks(text: string) {
  const blocks = text.split(/\n{2,}/);
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (trimmed.startsWith("# ")) {
      return <Text key={i} style={s.h1}>{trimmed.slice(2)}</Text>;
    }
    if (trimmed.startsWith("## ")) {
      return <Text key={i} style={s.h2}>{trimmed.slice(3)}</Text>;
    }
    if (trimmed.startsWith("- ")) {
      return (
        <View key={i} style={s.list}>
          {trimmed.split("\n").map((line, j) => (
            <Text key={j} style={s.li}>• {line.replace(/^- /, "")}</Text>
          ))}
        </View>
      );
    }
    return <Text key={i} style={s.p}>{trimmed}</Text>;
  });
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { color: colors.white, fontSize: 18, fontWeight: "600", flex: 1, textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  error: { color: colors.gray, fontSize: 14, textAlign: "center" },
  content: { padding: 24, paddingBottom: 60 },
  meta: { color: colors.grayDark, fontSize: 12, marginBottom: 18 },
  h1: { color: colors.white, fontSize: 24, fontWeight: "800", marginTop: 8, marginBottom: 14 },
  h2: { color: colors.white, fontSize: 17, fontWeight: "700", marginTop: 22, marginBottom: 8 },
  p: { color: colors.gray, fontSize: 14, lineHeight: 22, marginBottom: 4 },
  list: { marginBottom: 4 },
  li: { color: colors.gray, fontSize: 14, lineHeight: 22, paddingLeft: 8 },
});
