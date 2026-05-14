import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { router, Stack, useFocusEffect } from "expo-router";
import { Apple, ChevronLeft, Coins, Sparkles } from "lucide-react-native";
import { colors } from "../src/constants/theme";
import {
  subscription as subscriptionApi,
  wallet as walletApi,
  type SubscriptionStatus,
  type WalletPackage,
  type WalletState,
  type WalletTransaction,
} from "../src/lib/api";
import {
  iapBuyConsumable,
  iapFinishConsumable,
  iapInit,
  IAP_CREDIT_PACKAGES,
  isIapPlatform,
} from "../src/services/iapService";

export default function WalletScreen() {
  const useIap = isIapPlatform();
  const [walletState, setWalletState] = useState<WalletState | null>(null);
  const [packages, setPackages] = useState<WalletPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyPackage, setBusyPackage] = useState<string | null>(null);
  const [legacySub, setLegacySub] = useState<SubscriptionStatus | null>(null);

  const load = useCallback(async () => {
    try {
      const [w, p, s] = await Promise.all([
        walletApi.show(),
        walletApi.packages(),
        subscriptionApi.status().catch(() => null),
      ]);
      setWalletState(w);
      setPackages(p.packages ?? []);
      setLegacySub(s);
    } catch (e: any) {
      console.warn("[wallet.load]", e?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // useFocusEffect re-fires when the screen regains focus, including when
  // expo-web-browser's PayPal sheet closes and control returns to the app.
  useFocusEffect(
    useCallback(() => {
      if (useIap) iapInit();
      load();
    }, [load, useIap]),
  );

  async function handleTopupApple(pkg: WalletPackage) {
    setBusyPackage(pkg.id);
    try {
      const productId =
        IAP_CREDIT_PACKAGES[pkg.id] ?? pkg.apple_product ?? null;
      if (!productId) throw new Error("Produkt nicht konfiguriert.");

      const purchase = await iapBuyConsumable(productId);
      const result = await walletApi.validateAppleTopup(purchase.id);
      await iapFinishConsumable(purchase);

      Alert.alert("Aufgeladen", `${result.credits.toLocaleString("de-DE")} Credits gutgeschrieben.`);
      load();
    } catch (e: any) {
      if (e.code === "E_USER_CANCELLED") {
        // silent — user knows what they did
      } else {
        Alert.alert("Fehler", e?.message ?? "Aufladen fehlgeschlagen.");
      }
    } finally {
      setBusyPackage(null);
    }
  }

  async function handleTopupPaypal(pkg: WalletPackage) {
    // § 356 Abs. 5 BGB: Vor jedem Topup muss die Widerruf-Bestätigung
    // aktiv eingeholt werden. Vorher kein Order anlegen.
    const accepted = await new Promise<boolean>((resolve) => {
      Alert.alert(
        "Sofortige Bereitstellung",
        `Mit dem Kauf stimmst du der sofortigen Gutschrift von ${pkg.credits.toLocaleString("de-DE")} Credits auf dein Konto zu. ` +
          "Damit erlischt dein 14-tägiges Widerrufsrecht für diese Aufladung (§ 356 Abs. 5 BGB).",
        [
          { text: "Abbrechen", style: "cancel", onPress: () => resolve(false) },
          { text: "Verstanden, kaufen", onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
    if (!accepted) return;

    setBusyPackage(pkg.id);
    try {
      const order = await walletApi.createPaypalOrder(pkg.id, true);
      if (!order.approval_url) {
        Alert.alert("Fehler", "PayPal-Zahlung konnte nicht gestartet werden.");
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(
        order.approval_url,
        // PayPal redirects to our app.vouchmi.com/wallet/return; we treat any
        // dismissal as "user finished or cancelled" and verify by capturing.
        "https://app.vouchmi.com/wallet/return",
      );

      if (result.type !== "success" && result.type !== "dismiss") {
        return; // user explicitly closed
      }

      try {
        const captured = await walletApi.capturePaypalOrder(order.order_id, pkg.id);
        if (captured.ok) {
          Alert.alert("Aufgeladen", `${pkg.credits.toLocaleString("de-DE")} Credits gutgeschrieben.`);
        }
      } catch (e: any) {
        Alert.alert(
          "Aufladen unvollständig",
          "Der Kauf konnte nicht abgeschlossen werden. Falls dein Konto belastet wurde, kontaktiere bitte den Support.",
        );
      }

      load();
    } catch (e: any) {
      Alert.alert("Fehler", e?.message ?? "Aufladen fehlgeschlagen.");
    } finally {
      setBusyPackage(null);
    }
  }

  function handleTopup(pkg: WalletPackage) {
    if (useIap) {
      handleTopupApple(pkg);
    } else {
      handleTopupPaypal(pkg);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const balance = walletState?.wallet.balance_credits ?? 0;
  const transactions = walletState?.transactions ?? [];

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.headerBtn} hitSlop={12}>
          <ChevronLeft size={26} color={colors.white} />
        </Pressable>
        <Text style={s.title}>Wallet</Text>
        <View style={s.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {legacySub?.has_active && legacySub.payment_provider === "apple_iap" && legacySub.auto_renew ? (
          <View style={s.legacyBanner}>
            <View style={s.legacyBannerRow}>
              <Apple size={16} color={colors.accent} />
              <Text style={s.legacyBannerTitle}>Apple-Abo läuft noch</Text>
            </View>
            <Text style={s.legacyBannerBody}>
              Deine Credits sind unabhängig von deinem Apple-Abo gutgeschrieben. Damit Apple
              dein Abo nicht weiter verlängert, deaktiviere es bitte in den iPhone-Einstellungen.
            </Text>
            <Pressable
              style={s.legacyBannerBtn}
              onPress={() =>
                Linking.openURL("itms-apps://apps.apple.com/account/subscriptions").catch(() =>
                  Linking.openURL("https://apps.apple.com/account/subscriptions"),
                )
              }
            >
              <Text style={s.legacyBannerBtnText}>iOS-Abos öffnen</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={s.balanceCard}>
          <View style={s.balanceRow}>
            <Coins size={28} color={colors.accent} />
            <Text style={s.balanceLabel}>Aktuelles Guthaben</Text>
          </View>
          <Text style={s.balanceValue}>{balance.toLocaleString("de-DE")}</Text>
          <Text style={s.balanceUnit}>Credits</Text>
        </View>

        <View style={s.sectionHeader}>
          <Sparkles size={16} color={colors.accent} />
          <Text style={s.sectionTitle}>Aufladen</Text>
        </View>

        <View style={s.packageGrid}>
          {packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              busy={busyPackage === pkg.id}
              onPress={() => handleTopup(pkg)}
            />
          ))}
        </View>

        <Text style={s.payHint}>
          {useIap
            ? "Zahlung über deinen App-Store-Account."
            : "Zahlung über PayPal in einem sicheren Browser-Fenster."}
        </Text>

        <View style={[s.sectionHeader, { marginTop: 32 }]}>
          <Text style={s.sectionTitle}>Verlauf</Text>
        </View>

        {transactions.length === 0 ? (
          <Text style={s.emptyText}>Noch keine Transaktionen.</Text>
        ) : (
          transactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
        )}

        <Text style={s.footnote}>
          Credits können nach Kauf nicht zurückerstattet werden (außer bei
          fehlerhaften Buchungen). Apple- und PayPal-Refunds werden automatisch
          verarbeitet.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function PackageCard({ pkg, busy, onPress }: { pkg: WalletPackage; busy: boolean; onPress: () => void }) {
  const price = (pkg.price_cents / 100).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return (
    <Pressable onPress={onPress} disabled={busy} style={({ pressed }) => [s.packageCard, pressed && { opacity: 0.85 }]}>
      <Text style={s.packageCredits}>{pkg.credits.toLocaleString("de-DE")}</Text>
      <Text style={s.packageLabel}>Credits</Text>
      <View style={s.packagePriceRow}>
        {busy ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={s.packagePrice}>
            {price} {pkg.currency}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function TransactionRow({ tx }: { tx: WalletTransaction }) {
  const delta = tx.credits_delta;
  const sign = delta > 0 ? "+" : "";
  const date = new Date(tx.created_at).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const label = LABELS[tx.type] ?? tx.type;
  const reversed = tx.status === "reversed";

  return (
    <View style={s.txRow}>
      <View style={{ flex: 1 }}>
        <Text style={[s.txLabel, reversed && s.txReversed]}>{label}</Text>
        <Text style={s.txMeta}>
          {date}
          {tx.provider ? ` · ${tx.provider === "paypal" ? "PayPal" : tx.provider === "apple_iap" ? "Apple" : tx.provider}` : ""}
        </Text>
      </View>
      <Text style={[s.txDelta, delta > 0 ? s.txPositive : s.txNegative, reversed && s.txReversed]}>
        {sign}
        {delta.toLocaleString("de-DE")}
      </Text>
    </View>
  );
}

const LABELS: Record<WalletTransaction["type"], string> = {
  topup: "Aufladung",
  boost_spend: "Boost",
  refund: "Erstattung",
  admin_adjust: "Manuelle Anpassung",
  migration_bonus: "Migration-Bonus",
  reversal: "Stornierung",
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { color: colors.white, fontSize: 17, fontWeight: "600" },
  scroll: { padding: 16, paddingBottom: 48 },

  balanceCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 24,
  },
  balanceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  balanceLabel: { color: colors.gray, fontSize: 14 },
  balanceValue: { color: colors.accent, fontSize: 44, fontWeight: "700", marginTop: 8 },
  balanceUnit: { color: colors.white, fontSize: 14, opacity: 0.7 },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionTitle: { color: colors.white, fontSize: 16, fontWeight: "600" },

  packageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  packageCard: {
    width: "48%",
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 16,
    minHeight: 110,
    justifyContent: "space-between",
  },
  packageCredits: { color: colors.white, fontSize: 22, fontWeight: "700" },
  packageLabel: { color: colors.gray, fontSize: 12, marginBottom: 8 },
  packagePriceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  packagePrice: { color: colors.accent, fontWeight: "600" },

  payHint: { color: colors.gray, fontSize: 12, marginTop: 12, textAlign: "center" },

  emptyText: { color: colors.gray, fontStyle: "italic", marginTop: 12 },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  txLabel: { color: colors.white, fontSize: 14, fontWeight: "500" },
  txMeta: { color: colors.gray, fontSize: 12, marginTop: 2 },
  txDelta: { fontSize: 16, fontWeight: "600", marginLeft: 12 },
  txPositive: { color: colors.success },
  txNegative: { color: colors.coral },
  txReversed: { textDecorationLine: "line-through", opacity: 0.6 },

  footnote: { color: colors.grayDark, fontSize: 11, marginTop: 32, lineHeight: 16 },

  legacyBanner: {
    backgroundColor: colors.accentDim,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  legacyBannerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  legacyBannerTitle: { color: colors.accent, fontWeight: "700", fontSize: 13 },
  legacyBannerBody: { color: colors.white, fontSize: 13, lineHeight: 18, marginTop: 6 },
  legacyBannerBtn: {
    alignSelf: "flex-start",
    marginTop: 10,
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  legacyBannerBtnText: { color: colors.bg, fontWeight: "700", fontSize: 13 },
});
