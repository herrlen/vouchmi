import { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, ScrollView, ActivityIndicator, Linking, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useFocusEffect } from "expo-router";
import { ChevronLeft, CreditCard, RotateCcw, ExternalLink, Shield, Apple, Smartphone } from "lucide-react-native";
import { colors } from "../src/constants/theme";
import { subscription as subApi, type SubscriptionStatus } from "../src/lib/api";
import { useAuth } from "../src/lib/store";
import {
  isIapPlatform, iapInit, iapRestore, iapVerifyWithBackend, iapFinish, IAP_PRODUCTS,
} from "../src/services/iapService";

export default function SubscriptionScreen() {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const useIap = isIapPlatform();

  const load = useCallback(async () => {
    try {
      const s = await subApi.status();
      setStatus(s);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    if (useIap) iapInit();
    load();
  }, [load, useIap]));

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const purchases = await iapRestore();
      if (purchases.length === 0) {
        Alert.alert("Hinweis", "Keine aktiven Kaeufe gefunden.");
        return;
      }

      for (const p of purchases) {
        const productId = p.productId;
        if (productId === IAP_PRODUCTS.influencer || productId === IAP_PRODUCTS.brand) {
          await iapVerifyWithBackend(p, productId);
          await iapFinish(p);
        }
      }

      Alert.alert("Erfolg", "Kaeufe wurden wiederhergestellt.");
      load();
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    } finally {
      setRestoring(false);
    }
  };

  const openManageSubscriptions = () => {
    if (status?.payment_provider === "apple_iap" || Platform.OS === "ios") {
      Linking.openURL("https://apps.apple.com/account/subscriptions");
    } else {
      // PayPal: oeffne PayPal Abo-Verwaltung
      Linking.openURL("https://www.paypal.com/myaccount/autopay/");
    }
  };

  const planLabel = status?.plan_type === "brand" ? "Brand" : status?.plan_type === "influencer" ? "Influencer" : "Keins";
  const isActive = status?.has_active ?? false;
  const isApple = status?.payment_provider === "apple_iap";
  const isPaypal = status?.payment_provider === "paypal";

  const expiresFormatted = status?.expires_at
    ? new Date(status.expires_at).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })
    : null;

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />
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
        <Text style={s.headerTitle}>Abo verwalten</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Status Card */}
        <View style={s.statusCard}>
          <View style={s.statusIcon}>
            <CreditCard color={isActive ? colors.success : colors.gray} size={28} />
          </View>
          <Text style={s.statusPlan}>{planLabel}-Abo</Text>
          <View style={[s.statusBadge, isActive ? s.badgeActive : s.badgeInactive]}>
            <Text style={[s.statusBadgeText, isActive ? s.badgeTextActive : s.badgeTextInactive]}>
              {isActive ? "Aktiv" : "Inaktiv"}
            </Text>
          </View>

          {/* Provider Badge */}
          {isActive && (
            <View style={s.providerRow}>
              {isApple ? (
                <Apple color={colors.gray} size={14} />
              ) : (
                <Smartphone color={colors.gray} size={14} />
              )}
              <Text style={s.providerText}>
                {isApple ? "App Store" : "PayPal"}
              </Text>
            </View>
          )}

          {/* Renewal / Expiry Info */}
          {isActive && expiresFormatted && (
            <Text style={s.statusDetail}>
              {status?.auto_renew
                ? `Verlaengert sich am ${expiresFormatted}`
                : `Laeuft ab am ${expiresFormatted}`}
            </Text>
          )}
        </View>

        {/* Manage Subscription */}
        {isActive && (
          <Pressable style={s.actionRow} onPress={openManageSubscriptions}>
            <ExternalLink color={colors.accent} size={20} />
            <View style={{ flex: 1 }}>
              <Text style={s.actionLabel}>Abo kuendigen oder aendern</Text>
              <Text style={s.actionSub}>
                {isApple
                  ? "Oeffnet die App Store Abo-Verwaltung"
                  : "Oeffnet die PayPal Abo-Verwaltung"}
              </Text>
            </View>
            <ChevronLeft color={colors.grayDark} size={18} style={{ transform: [{ rotate: "180deg" }] }} />
          </Pressable>
        )}

        {/* Upsell */}
        {!isActive && (
          <View style={s.upsellBox}>
            <Text style={s.upsellText}>
              {user?.role === "brand"
                ? "Erstelle dein Brand-Profil und werde von der Community entdeckt."
                : "Upgrade zum Creator und erhalte Analytics, Direktnachrichten an Brands und mehr."}
            </Text>
            <Pressable
              style={s.upsellCta}
              onPress={() => router.push(user?.role === "brand" ? "/brand-register" : "/influencer-register")}
            >
              <Text style={s.upsellCtaText}>
                {user?.role === "brand" ? "Brand-Abo starten" : "Influencer-Abo starten"}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Restore Purchases — Pflicht laut Apple HIG */}
        {useIap && (
          <>
            <View style={s.divider} />
            <Pressable style={s.actionRow} onPress={handleRestore} disabled={restoring}>
              {restoring ? (
                <ActivityIndicator color={colors.gray} size="small" />
              ) : (
                <RotateCcw color={colors.gray} size={20} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.actionLabel}>Kaeufe wiederherstellen</Text>
                <Text style={s.actionSub}>Stellt vorherige In-App-Kaeufe wieder her</Text>
              </View>
            </Pressable>
          </>
        )}

        {/* Legal Info */}
        <View style={s.divider} />
        <View style={s.infoBox}>
          <Shield color={colors.grayDark} size={16} />
          <Text style={s.infoText}>
            {isApple
              ? "Abos werden ueber deinen App Store Account abgerechnet und verlaengern sich automatisch. Die Kuendigung erfolgt ueber Einstellungen > Apple-ID > Abonnements."
              : isPaypal
                ? "Abos werden ueber PayPal abgerechnet. Du kannst jederzeit in deinem PayPal-Konto unter Automatische Zahlungen kuendigen."
                : useIap
                  ? "Abos werden ueber den App Store abgerechnet."
                  : "Abos werden ueber PayPal abgerechnet."}
          </Text>
        </View>

        {/* Legal Links */}
        <View style={s.legalLinks}>
          <Text style={s.legalLink} onPress={() => Linking.openURL("https://vouchmi.com/agb")}>Nutzungsbedingungen</Text>
          <Text style={s.legalSep}>·</Text>
          <Text style={s.legalLink} onPress={() => Linking.openURL("https://vouchmi.com/datenschutz")}>Datenschutz</Text>
        </View>
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

  statusCard: { backgroundColor: colors.bgCard, borderRadius: 20, padding: 28, alignItems: "center", marginBottom: 24 },
  statusIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.bgInput, justifyContent: "center", alignItems: "center", marginBottom: 14 },
  statusPlan: { color: colors.white, fontSize: 22, fontWeight: "800" },
  statusBadge: { marginTop: 10, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  badgeActive: { backgroundColor: colors.success + "20" },
  badgeInactive: { backgroundColor: colors.grayDark + "20" },
  statusBadgeText: { fontSize: 13, fontWeight: "700" },
  badgeTextActive: { color: colors.success },
  badgeTextInactive: { color: colors.grayDark },
  providerRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  providerText: { color: colors.gray, fontSize: 13 },
  statusDetail: { color: colors.gray, fontSize: 13, marginTop: 8 },

  actionRow: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.bgCard, borderRadius: 16, padding: 18, marginBottom: 10 },
  actionLabel: { color: colors.white, fontSize: 15, fontWeight: "600" },
  actionSub: { color: colors.gray, fontSize: 12, marginTop: 2 },

  upsellBox: { backgroundColor: colors.bgCard, borderRadius: 16, padding: 24, alignItems: "center", marginBottom: 10, borderWidth: 1, borderColor: colors.accent + "30" },
  upsellText: { color: colors.gray, fontSize: 14, textAlign: "center", lineHeight: 20 },
  upsellCta: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28, marginTop: 16 },
  upsellCtaText: { color: colors.bg, fontSize: 15, fontWeight: "700" },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },

  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8 },
  infoText: { color: colors.grayDark, fontSize: 12, lineHeight: 18, flex: 1 },

  legalLinks: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 12 },
  legalLink: { color: colors.indigo, fontSize: 13, textDecorationLine: "underline" },
  legalSep: { color: colors.grayDark, fontSize: 13 },
});
