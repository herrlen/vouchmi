import { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { ChevronLeft, Building2, Globe, Mail, Briefcase, RotateCcw } from "lucide-react-native";
import * as WebBrowser from "expo-web-browser";
import { colors } from "../src/constants/theme";
import { brand as brandApi, subscription } from "../src/lib/api";
import { useAuth } from "../src/lib/store";
import {
  isIapPlatform, iapInit, iapRequestSubscription,
  iapFinish, iapVerifyWithBackend, iapRestore, IAP_PRODUCTS,
} from "../src/services/iapService";

export default function BrandRegisterScreen() {
  const { user } = useAuth();
  const [brandName, setBrandName] = useState("");
  const [companyEmail, setCompanyEmail] = useState(user?.email ?? "");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [step, setStep] = useState<"form" | "paying" | "done">("form");
  const useIap = isIapPlatform();

  useEffect(() => {
    if (useIap) iapInit();
  }, [useIap]);

  const registerBrandProfile = async () => {
    await brandApi.register({
      brand_name: brandName.trim(),
      company_email: companyEmail.trim(),
      website_url: websiteUrl.trim() || undefined,
      industry: industry.trim() || undefined,
      description: description.trim() || undefined,
    });
  };

  // ── iOS: StoreKit 2 IAP ──
  const handleIapPurchase = async () => {
    if (!brandName.trim()) return Alert.alert("Fehler", "Brand-Name wird benoetigt.");
    if (!companyEmail.trim()) return Alert.alert("Fehler", "Firmen-E-Mail wird benoetigt.");

    setLoading(true);
    try {
      await registerBrandProfile();

      setStep("paying");
      const purchase = await iapRequestSubscription(IAP_PRODUCTS.brand);

      const { verified } = await iapVerifyWithBackend(purchase, IAP_PRODUCTS.brand);
      if (!verified) {
        Alert.alert("Fehler", "Receipt-Validierung fehlgeschlagen.");
        setStep("form");
        return;
      }

      await iapFinish(purchase);
      setStep("done");
      setTimeout(() => router.replace("/(tabs)/profile"), 1500);
    } catch (e: any) {
      if (e.code === "E_USER_CANCELLED") {
        setStep("form");
      } else {
        Alert.alert("Fehler", e.message);
        setStep("form");
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
      const brandPurchase = purchases.find(
        (p) => p.productId === IAP_PRODUCTS.brand
      );
      if (brandPurchase) {
        await iapVerifyWithBackend(brandPurchase, IAP_PRODUCTS.brand);
        await iapFinish(brandPurchase);
        Alert.alert("Erfolg", "Dein Brand-Abo wurde wiederhergestellt.");
        router.replace("/(tabs)/profile");
      } else {
        Alert.alert("Hinweis", "Kein aktives Brand-Abo gefunden.");
      }
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    } finally {
      setRestoring(false);
    }
  };

  // ── Android: PayPal ──
  const handlePaypal = async () => {
    if (!brandName.trim()) return Alert.alert("Fehler", "Brand-Name wird benoetigt.");
    if (!companyEmail.trim()) return Alert.alert("Fehler", "Firmen-E-Mail wird benoetigt.");

    setLoading(true);
    try {
      await registerBrandProfile();

      const { approval_url, configured } = await brandApi.subscribe();

      if (!configured) {
        Alert.alert(
          "Bald verfuegbar",
          "Die Bezahlung per PayPal wird gerade eingerichtet. Dein Brand-Profil wurde angelegt und wird automatisch aktiviert, sobald es losgehen kann."
        );
        router.back();
        return;
      }

      if (approval_url) {
        setStep("paying");
        await WebBrowser.openAuthSessionAsync(
          approval_url,
          "https://api.vouchmi.com/brand/return"
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
          Alert.alert("Hinweis", "Zahlung wird verarbeitet. Dein Brand-Profil wird aktiviert, sobald PayPal bestaetigt.");
          router.back();
        }
      } else {
        Alert.alert("Hinweis", "Brand-Profil wurde angelegt. Abo-Aktivierung steht noch aus.");
        router.back();
      }
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = useIap ? handleIapPurchase : handlePaypal;

  if (step === "paying") {
    return (
      <SafeAreaView style={s.container} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.centerBox}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={s.payingTitle}>Zahlung wird verarbeitet...</Text>
          <Text style={s.payingSubtitle}>Kehre nach Abschluss der PayPal-Zahlung hierher zurueck.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (step === "done") {
    return (
      <SafeAreaView style={s.container} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.centerBox}>
          <Text style={s.doneEmoji}>&#10003;</Text>
          <Text style={s.payingTitle}>Brand-Konto aktiviert!</Text>
          <Text style={s.payingSubtitle}>Du wirst weitergeleitet...</Text>
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
        <Text style={s.headerTitle}>Brand-Konto erstellen</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll}>
          <Text style={s.leadText}>
            Erstelle dein Brand-Profil und werde von der Vouchmi-Community entdeckt.
          </Text>

          <View style={s.inputGroup}>
            <View style={s.inputIcon}><Building2 color={colors.gray} size={18} /></View>
            <TextInput
              style={s.input}
              placeholder="Brand-Name *"
              placeholderTextColor={colors.grayDark}
              value={brandName}
              onChangeText={setBrandName}
              autoCapitalize="words"
            />
          </View>

          <View style={s.inputGroup}>
            <View style={s.inputIcon}><Mail color={colors.gray} size={18} /></View>
            <TextInput
              style={s.input}
              placeholder="Firmen-E-Mail *"
              placeholderTextColor={colors.grayDark}
              value={companyEmail}
              onChangeText={setCompanyEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={s.inputGroup}>
            <View style={s.inputIcon}><Globe color={colors.gray} size={18} /></View>
            <TextInput
              style={s.input}
              placeholder="Website (optional)"
              placeholderTextColor={colors.grayDark}
              value={websiteUrl}
              onChangeText={setWebsiteUrl}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          <View style={s.inputGroup}>
            <View style={s.inputIcon}><Briefcase color={colors.gray} size={18} /></View>
            <TextInput
              style={s.input}
              placeholder="Branche (optional)"
              placeholderTextColor={colors.grayDark}
              value={industry}
              onChangeText={setIndustry}
            />
          </View>

          <TextInput
            style={[s.input, s.textArea]}
            placeholder="Beschreibung (optional)"
            placeholderTextColor={colors.grayDark}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          <View style={s.priceBox}>
            <Text style={s.priceLabel}>Brand-Abo</Text>
            <Text style={s.priceValue}>1,99 EUR/Monat</Text>
            <Text style={s.priceSub}>
              {useIap ? "Automatische Verlaengerung. Jederzeit kuendbar in den iOS-Einstellungen." : "Jederzeit kuendbar · Zahlung via PayPal"}
            </Text>
          </View>

          <Pressable
            style={[s.cta, loading && s.ctaDisabled]}
            onPress={handleRegister}
            disabled={loading || restoring}
          >
            {loading ? (
              <ActivityIndicator color={colors.bg} />
            ) : (
              <Text style={s.ctaText}>Brand-Konto erstellen — 1,99 EUR/Monat</Text>
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 8 },
  backBtn: { minWidth: 44, minHeight: 44, justifyContent: "center" },
  headerTitle: { color: colors.white, fontSize: 17, fontWeight: "600" },
  scroll: { padding: 24, paddingBottom: 100 },
  leadText: { color: colors.gray, fontSize: 15, lineHeight: 22, marginBottom: 24 },

  inputGroup: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bgInput, borderRadius: 12, marginBottom: 12 },
  inputIcon: { paddingLeft: 14 },
  input: { flex: 1, color: colors.white, fontSize: 16, paddingHorizontal: 14, paddingVertical: 16, borderRadius: 12, backgroundColor: colors.bgInput },
  textArea: { minHeight: 80, textAlignVertical: "top", marginBottom: 12 },

  priceBox: { backgroundColor: colors.bgCard, borderRadius: 16, padding: 20, marginVertical: 20, alignItems: "center", borderWidth: 1, borderColor: colors.accent + "40" },
  priceLabel: { color: colors.gray, fontSize: 12, fontWeight: "600", letterSpacing: 1.5, textTransform: "uppercase" },
  priceValue: { color: colors.accent, fontSize: 28, fontWeight: "800", marginTop: 4 },
  priceSub: { color: colors.gray, fontSize: 13, marginTop: 6 },

  cta: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: colors.bg, fontSize: 17, fontWeight: "700" },

  legalRow: { marginTop: 16, paddingHorizontal: 8 },
  legalText: { color: colors.grayDark, fontSize: 12, lineHeight: 18, textAlign: "center" },
  legalLink: { color: colors.indigo, textDecorationLine: "underline" },

  restoreBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16, paddingVertical: 12 },
  restoreText: { color: colors.gray, fontSize: 14, fontWeight: "500" },

  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  payingTitle: { color: colors.white, fontSize: 20, fontWeight: "700", marginTop: 20 },
  payingSubtitle: { color: colors.gray, fontSize: 15, marginTop: 8, textAlign: "center" },
  doneEmoji: { fontSize: 48, color: colors.success },
});
