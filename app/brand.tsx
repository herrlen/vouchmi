import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Image, ScrollView, ActivityIndicator, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { colors } from "../src/constants/theme";
import { brand as brandApi, type Brand } from "../src/lib/api";
import { useAuth } from "../src/lib/store";

export default function BrandScreen() {
  const user = useAuth((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Brand | null>(null);

  useEffect(() => {
    (async () => {
      if (user?.role !== "brand") {
        setLoading(false);
        return;
      }
      try {
        const { brand } = await brandApi.me();
        setData(brand);
      } catch {}
      setLoading(false);
    })();
  }, [user]);

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={s.back}>‹ Zurück</Text>
        </Pressable>
        <Text style={s.title}>Brand</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : user?.role !== "brand" ? (
        <ScrollView contentContainerStyle={s.centerContent}>
          <Text style={s.emoji}>🏷️</Text>
          <Text style={s.headline}>Für Marken & Unternehmen</Text>
          <Text style={s.body}>
            Du möchtest deine Marke auf Vouchmi vertreten? Brand-Accounts erstellst du ausschließlich auf unserer Website.
          </Text>
          <Text style={s.body}>
            Voraussetzungen: Firmen-E-Mail-Adresse, PayPal-Account und €5/Monat.
          </Text>
          <Pressable style={s.linkBtn} onPress={() => Linking.openURL("https://vouchmi.com/brands")}>
            <Text style={s.linkBtnText}>Mehr erfahren</Text>
          </Pressable>
          <Text style={s.footnote}>
            Die Registrierung läuft über die Website, nicht über diese App.
          </Text>
        </ScrollView>
      ) : !data ? (
        <ScrollView contentContainerStyle={s.centerContent}>
          <Text style={s.emoji}>⚠️</Text>
          <Text style={s.headline}>Brand-Profil fehlt</Text>
          <Text style={s.body}>
            Dein Account ist als Brand markiert, aber es gibt noch kein Profil. Bitte vervollständige das Setup auf der Website.
          </Text>
          <Pressable style={s.linkBtn} onPress={() => Linking.openURL("https://vouchmi.com/brand/setup")}>
            <Text style={s.linkBtnText}>Zur Website</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <View style={s.brandHeader}>
            {data.logo_url ? (
              <Image source={{ uri: data.logo_url }} style={s.logo} />
            ) : (
              <View style={[s.logo, s.logoPlaceholder]}>
                <Text style={s.logoInitial}>{data.brand_name[0]}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={s.brandName}>{data.brand_name}</Text>
                {data.is_verified && <Text style={s.verified}>✓</Text>}
              </View>
              {data.industry && <Text style={s.industry}>{data.industry}</Text>}
            </View>
          </View>

          {data.description && (
            <Text style={s.description}>{data.description}</Text>
          )}

          {data.website_url && (
            <Pressable style={s.websiteBtn} onPress={() => data.website_url && Linking.openURL(data.website_url)}>
              <Text style={s.websiteText}>{data.website_url}</Text>
            </Pressable>
          )}

          <View style={s.infoBox}>
            <Text style={s.infoTitle}>Brand-Verwaltung</Text>
            <Text style={s.infoText}>
              Logo, Beschreibung, Sponsored Drops und Analytics verwaltest du auf vouchmi.com/brand.
            </Text>
            <Pressable onPress={() => Linking.openURL("https://vouchmi.com/brand")}>
              <Text style={s.infoLink}>Zur Brand-Verwaltung →</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  back: { color: colors.accent, fontSize: 16, width: 60 },
  title: { color: colors.white, fontSize: 18, fontWeight: "600" },
  centerContent: { padding: 32, alignItems: "center" },
  emoji: { fontSize: 64, marginTop: 40, marginBottom: 16 },
  headline: { color: colors.white, fontSize: 22, fontWeight: "700", marginBottom: 12, textAlign: "center" },
  body: { color: colors.gray, fontSize: 15, lineHeight: 22, textAlign: "center", marginBottom: 16 },
  linkBtn: { backgroundColor: colors.accent, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  linkBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  footnote: { color: colors.grayDark, fontSize: 11, marginTop: 16, textAlign: "center", lineHeight: 16 },
  brandHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
  logo: { width: 70, height: 70, borderRadius: 14, backgroundColor: colors.bgCard },
  logoPlaceholder: { justifyContent: "center", alignItems: "center" },
  logoInitial: { color: colors.white, fontSize: 28, fontWeight: "700" },
  brandName: { color: colors.white, fontSize: 22, fontWeight: "700" },
  verified: { color: colors.accent, fontSize: 18 },
  industry: { color: colors.gray, fontSize: 13, marginTop: 2 },
  description: { color: colors.white, fontSize: 15, lineHeight: 22, backgroundColor: colors.bgCard, padding: 14, borderRadius: 12, marginBottom: 12 },
  websiteBtn: { padding: 14, backgroundColor: colors.bgCard, borderRadius: 12, marginBottom: 12 },
  websiteText: { color: colors.accent, fontSize: 14 },
  infoBox: { backgroundColor: colors.bgCard, padding: 16, borderRadius: 12, marginTop: 14 },
  infoTitle: { color: colors.white, fontSize: 14, fontWeight: "600", marginBottom: 6 },
  infoText: { color: colors.gray, fontSize: 13, lineHeight: 19, marginBottom: 10 },
  infoLink: { color: colors.accent, fontSize: 14 },
});
