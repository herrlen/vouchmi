import { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Alert, ScrollView, ActivityIndicator, Platform, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { ChevronLeft, BarChart3, MessageCircle, Star, Check, RotateCcw } from "lucide-react-native";
import * as WebBrowser from "expo-web-browser";
import { colors } from "../src/constants/theme";
import { influencer as influencerApi, subscription } from "../src/lib/api";
import { useAuth } from "../src/lib/store";
import {
  isIapPlatform, iapInit, iapRequestSubscription,
  iapFinish, iapVerifyWithBackend, iapRestore, IAP_PRODUCTS,
} from "../src/services/iapService";

const BENEFITS = [
  { icon: BarChart3, label: "Analytics-Dashboard", desc: "Sieh in Echtzeit, wie oft deine Empfehlungen angeklickt werden." },
  { icon: MessageCircle, label: "Direkter Draht zu Brands", desc: "Schreibe Marken direkt an fuer Kooperationen." },
  { icon: Star, label: "Creator-Badge", desc: "Dein Profil bekommt das Creator-Badge. Marken finden dich gezielt." },
] as const;

const COMPARISON = [
  { feature: "Empfehlungen posten", free: true, pro: true },
  { feature: "Communities beitreten", free: true, pro: true },
  { feature: "Analytics-Dashboard", free: false, pro: true },
  { feature: "Brands anschreiben", free: false, pro: true },
  { feature: "Sichtbarkeit fuer Brands", free: false, pro: true },
  { feature: "Creator-Badge", free: false, pro: true },
];

export default function InfluencerRegisterScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [step, setStep] = useState<"info" | "paying" | "done">("info");
  const useIap = isIapPlatform();

  useEffect(() => {
    if (useIap) iapInit();
  }, [useIap]);

  // ── iOS: StoreKit 2 IAP ──
  const handleIapPurchase = async () => {
    setLoading(true);
    try {
      // 1. Rolle auf Influencer setzen
      if (user?.role !== "influencer") {
        await influencerApi.register();
      }

      // 2. StoreKit Purchase
      setStep("paying");
      const purchase = await iapRequestSubscription(IAP_PRODUCTS.influencer);

      // 3. Receipt an Backend senden
      const { verified } = await iapVerifyWithBackend(purchase, IAP_PRODUCTS.influencer);
      if (!verified) {
        Alert.alert("Fehler", "Receipt-Validierung fehlgeschlagen.");
        setStep("info");
        return;
      }

      // 4. Transaction bei Apple abschliessen
      await iapFinish(purchase);

      setStep("done");
      setTimeout(() => router.replace("/(tabs)/profile"), 1500);
    } catch (e: any) {
      if (e.code === "E_USER_CANCELLED") {
        setStep("info");
      } else {
        Alert.alert("Fehler", e.message);
        setStep("info");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── iOS: Restore Purchases ──
  const handleRestore = async () => {
    setRestoring(true);
    try {
      const purchases = await iapRestore();
      const influencerPurchase = purchases.find(
        (p) => p.productId === IAP_PRODUCTS.influencer
      );
      if (influencerPurchase) {
        await iapVerifyWithBackend(influencerPurchase, IAP_PRODUCTS.influencer);
        await iapFinish(influencerPurchase);
        Alert.alert("Erfolg", "Dein Influencer-Abo wurde wiederhergestellt.");
        router.replace("/(tabs)/profile");
      } else {
        Alert.alert("Hinweis", "Kein aktives Influencer-Abo gefunden.");
      }
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    } finally {
      setRestoring(false);
    }
  };

  // ── Android: PayPal ──
  const handlePaypal = async () => {
    setLoading(true);
    try {
      if (user?.role !== "influencer") {
        await influencerApi.register();
      }

      const { approval_url } = await influencerApi.subscribe();

      if (approval_url) {
        setStep("paying");
        await WebBrowser.openAuthSessionAsync(
          approval_url,
          "https://api.vouchmi.com/influencer/return"
        );

        let attempts = 0;
        const poll = async (): Promise<boolean> => {
          const status = await subscription.status();
          if (status.has_active) return true;
          if (attempts++ >= 10) return false;
          await new Promise((r) => setTimeout(r, 3000));
          return poll();
        };

        const active = await poll();
        if (active) {
          setStep("done");
          setTimeout(() => router.replace("/(tabs)/profile"), 1500);
        } else {
          Alert.alert("Hinweis", "Zahlung wird verarbeitet. Dein Influencer-Status wird aktiviert, sobald PayPal bestaetigt.");
          router.back();
        }
      } else {
        Alert.alert("Hinweis", "Influencer-Rolle wurde gesetzt. Abo-Aktivierung steht noch aus.");
        router.back();
      }
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = useIap ? handleIapPurchase : handlePaypal;

  if (step === "paying") {
    return (
      <SafeAreaView style={s.container} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.centerBox}>
          <ActivityIndicator color={colors.coral} size="large" />
          <Text style={s.statusTitle}>Zahlung wird verarbeitet...</Text>
          <Text style={s.statusSub}>Kehre nach Abschluss der PayPal-Zahlung hierher zurueck.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (step === "done") {
    return (
      <SafeAreaView style={s.container} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.centerBox}>
          <Text style={s.doneCheck}>&#10003;</Text>
          <Text style={s.statusTitle}>Influencer-Konto aktiviert!</Text>
          <Text style={s.statusSub}>Du wirst weitergeleitet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
          <ChevronLeft color={colors.white} size={24} strokeWidth={2} />
        </Pressable>
        <Text style={s.headerTitle}>Creator werden</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.headline}>Werde von Marken entdeckt — messbar, nicht geraten.</Text>
        <Text style={s.lead}>
          Mit dem Influencer-Abo zeigst du Marken exakt, welche Reichweite deine Empfehlungen haben.
        </Text>

        {/* Benefits */}
        {BENEFITS.map(({ icon: Icon, label, desc }) => (
          <View key={label} style={s.benefitCard}>
            <View style={s.benefitIcon}>
              <Icon color={colors.coral} size={22} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.benefitLabel}>{label}</Text>
              <Text style={s.benefitDesc}>{desc}</Text>
            </View>
          </View>
        ))}

        {/* Comparison table */}
        <View style={s.tableCard}>
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderText, { flex: 1 }]}>Feature</Text>
            <Text style={[s.tableHeaderText, { width: 60, textAlign: "center" }]}>Free</Text>
            <Text style={[s.tableHeaderText, { width: 80, textAlign: "center", color: colors.coral }]}>Creator</Text>
          </View>
          {COMPARISON.map(({ feature, free, pro }) => (
            <View key={feature} style={s.tableRow}>
              <Text style={[s.tableCell, { flex: 1 }]}>{feature}</Text>
              <View style={{ width: 60, alignItems: "center" }}>
                {free ? <Check color={colors.success} size={16} /> : <Text style={s.tableDash}>—</Text>}
              </View>
              <View style={{ width: 80, alignItems: "center" }}>
                {pro ? <Check color={colors.coral} size={16} /> : <Text style={s.tableDash}>—</Text>}
              </View>
            </View>
          ))}
        </View>

        {/* Price */}
        <View style={s.priceBox}>
          <Text style={s.priceValue}>0,99 EUR/Monat</Text>
          <Text style={s.priceSub}>
            {useIap ? "Automatische Verlaengerung. Jederzeit kuendbar in den iOS-Einstellungen." : "Jederzeit kuendbar · Zahlung via PayPal"}
          </Text>
        </View>

        <Pressable
          style={[s.cta, loading && s.ctaDisabled]}
          onPress={handleUpgrade}
          disabled={loading || restoring}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={s.ctaText}>Als Influencer starten — 0,99 EUR/Monat</Text>
          )}
        </Pressable>

        {/* Paywall Compliance: AGB + Datenschutz Links (Apple Review Pflicht) */}
        <View style={s.legalRow}>
          <Text style={s.legalText}>
            Mit dem Kauf akzeptierst du die{" "}
            <Text style={s.legalLink} onPress={() => Linking.openURL("https://vouchmi.com/agb")}>Nutzungsbedingungen</Text>
            {" "}und die{" "}
            <Text style={s.legalLink} onPress={() => Linking.openURL("https://vouchmi.com/datenschutz")}>Datenschutzerklaerung</Text>.
          </Text>
        </View>

        {useIap && (
          <Pressable
            style={s.restoreBtn}
            onPress={handleRestore}
            disabled={restoring || loading}
          >
            {restoring ? (
              <ActivityIndicator color={colors.gray} size="small" />
            ) : (
              <>
                <RotateCcw color={colors.gray} size={16} />
                <Text style={s.restoreText}>Kaeufe wiederherstellen</Text>
              </>
            )}
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 8 },
  backBtn: { minWidth: 44, minHeight: 44, justifyContent: "center" },
  headerTitle: { color: colors.white, fontSize: 17, fontWeight: "600" },
  scroll: { padding: 24, paddingBottom: 100 },

  headline: { color: colors.white, fontSize: 24, fontWeight: "800", lineHeight: 32, marginBottom: 8 },
  lead: { color: colors.gray, fontSize: 15, lineHeight: 22, marginBottom: 24 },

  benefitCard: { flexDirection: "row", alignItems: "flex-start", gap: 14, backgroundColor: colors.bgCard, borderRadius: 16, padding: 18, marginBottom: 10 },
  benefitIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.coral + "18", justifyContent: "center", alignItems: "center" },
  benefitLabel: { color: colors.white, fontSize: 16, fontWeight: "700" },
  benefitDesc: { color: colors.gray, fontSize: 13, marginTop: 4, lineHeight: 18 },

  tableCard: { backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, marginTop: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.coral + "30" },
  tableHeader: { flexDirection: "row", paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 6 },
  tableHeaderText: { color: colors.gray, fontSize: 11, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase" },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  tableCell: { color: colors.white, fontSize: 14 },
  tableDash: { color: colors.grayDark, fontSize: 16 },

  priceBox: { alignItems: "center", marginVertical: 20 },
  priceValue: { color: colors.coral, fontSize: 28, fontWeight: "800" },
  priceSub: { color: colors.gray, fontSize: 13, marginTop: 6 },

  cta: { backgroundColor: colors.coral, borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },

  legalRow: { marginTop: 16, paddingHorizontal: 8 },
  legalText: { color: colors.grayDark, fontSize: 12, lineHeight: 18, textAlign: "center" },
  legalLink: { color: colors.indigo, textDecorationLine: "underline" },

  restoreBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16, paddingVertical: 12 },
  restoreText: { color: colors.gray, fontSize: 14, fontWeight: "500" },

  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  statusTitle: { color: colors.white, fontSize: 20, fontWeight: "700", marginTop: 20 },
  statusSub: { color: colors.gray, fontSize: 15, marginTop: 8, textAlign: "center" },
  doneCheck: { fontSize: 48, color: colors.success },
});
