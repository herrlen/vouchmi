import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { ChevronLeft, CheckCircle2, ExternalLink } from "lucide-react-native";
import { colors } from "../src/constants/theme";
import { brand as brandApi, type BrandStatus } from "../src/lib/api";
import { useProfileMode } from "../src/lib/profile-mode";

type FormState = {
  brand_name: string;
  company_email: string;
  website_url: string;
  industry: string;
  description: string;
};

export default function BrandScreen() {
  const [status, setStatus] = useState<BrandStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>({ brand_name: "", company_email: "", website_url: "", industry: "", description: "" });
  const refreshProfileMode = useProfileMode((s) => s.refresh);

  const load = useCallback(async () => {
    try {
      const s = await brandApi.status();
      setStatus(s);
    } catch (e: any) {
      Alert.alert("Fehler", e.message ?? "Konnte Brand-Status nicht laden.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const submitRegister = async () => {
    if (!form.brand_name.trim() || !form.company_email.trim()) {
      return Alert.alert("Fehler", "Firmenname und Firmen-E-Mail sind Pflicht.");
    }
    setSubmitting(true);
    try {
      await brandApi.register({
        brand_name: form.brand_name.trim(),
        company_email: form.company_email.trim(),
        website_url: form.website_url.trim() || undefined,
        industry: form.industry.trim() || undefined,
        description: form.description.trim() || undefined,
      });
      await load();
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const startCheckout = async () => {
    setSubmitting(true);
    try {
      const res = await brandApi.subscribe();
      if (!res.approval_url) {
        Alert.alert("PayPal", "Das Abo kann momentan nicht gestartet werden. Bitte versuche es später erneut.");
        return;
      }
      if (!res.configured) {
        Alert.alert("Hinweis", "PayPal-Zahlung ist auf dem Server noch nicht eingerichtet. Die Approval-URL ist ein Platzhalter.");
      }
      await Linking.openURL(res.approval_url);
      // Nach Rückkehr: Status neu laden (Webhook kann bereits eingetroffen sein).
      await load();
      await refreshProfileMode();
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderBody = () => {
    if (loading) return <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />;

    // Noch kein Brand-Profil — Registrierungs-Formular
    if (!status?.has_brand) {
      return (
        <ScrollView contentContainerStyle={s.formContent} keyboardShouldPersistTaps="handled">
          <Text style={s.emoji}>🏷️</Text>
          <Text style={s.headline}>Brand-Profil erstellen</Text>
          <Text style={s.body}>Für 1,99 €/Monat erhältst du einen Brand-Account neben deinem persönlichen — umschaltbar über den Profil-Tab.</Text>

          <LabeledInput label="Firmenname *" value={form.brand_name} onChangeText={(t) => setForm({ ...form, brand_name: t })} />
          <LabeledInput label="Firmen-E-Mail *" value={form.company_email} onChangeText={(t) => setForm({ ...form, company_email: t })} keyboardType="email-address" autoCapitalize="none" />
          <LabeledInput label="Website" value={form.website_url} onChangeText={(t) => setForm({ ...form, website_url: t })} keyboardType="url" autoCapitalize="none" placeholder="https://" />
          <LabeledInput label="Branche" value={form.industry} onChangeText={(t) => setForm({ ...form, industry: t })} placeholder="z. B. Mode, Beauty, Sport" />
          <LabeledInput label="Kurzbeschreibung" value={form.description} onChangeText={(t) => setForm({ ...form, description: t })} multiline />

          <Pressable style={[s.btn, submitting && { opacity: 0.6 }]} onPress={submitRegister} disabled={submitting} accessibilityRole="button" accessibilityLabel="Weiter zum Abo" accessibilityState={{ disabled: submitting }}>
            <Text style={s.btnText}>{submitting ? "Moment..." : "Weiter zum Abo"}</Text>
          </Pressable>
          <Text style={s.footnote}>Der Abo-Abschluss erfolgt im nächsten Schritt über PayPal.</Text>
        </ScrollView>
      );
    }

    // Brand existiert, Abo aktiv
    if (status.is_active) {
      const b = status.brand!;
      return (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <View style={s.statusCard}>
            <CheckCircle2 color={colors.accent} size={32} strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Text style={s.statusTitle}>Abo aktiv</Text>
              <Text style={s.statusSub}>1,99 €/Monat · PayPal</Text>
            </View>
          </View>
          <View style={s.brandCard}>
            <Text style={s.brandName}>{b.brand_name}</Text>
            {b.company_email && <Text style={s.brandMeta}>{b.company_email}</Text>}
            {b.industry && <Text style={s.brandMeta}>{b.industry}</Text>}
            {b.website_url && <Text style={s.brandLink}>{b.website_url}</Text>}
          </View>
          <Pressable style={s.cancelBtn} accessibilityRole="button" accessibilityLabel="Abo kuendigen" onPress={() => {
            Alert.alert("Abo kündigen?", "Dein Brand-Status endet am Ende des laufenden Abrechnungszeitraums.", [
              { text: "Abbrechen", style: "cancel" },
              { text: "Kündigen", style: "destructive", onPress: async () => {
                try { await brandApi.cancel(); await load(); await refreshProfileMode(); } catch (e: any) { Alert.alert("Fehler", e.message); }
              } },
            ]);
          }}>
            <Text style={s.cancelText}>Abo kündigen</Text>
          </Pressable>
        </ScrollView>
      );
    }

    // Brand existiert, Abo NICHT aktiv → Subscribe anbieten
    return (
      <ScrollView contentContainerStyle={s.formContent}>
        <Text style={s.emoji}>💳</Text>
        <Text style={s.headline}>Abo abschließen</Text>
        <Text style={s.body}>
          Firmenname und E-Mail sind gespeichert. Jetzt nur noch das Abo über PayPal aktivieren.
        </Text>
        <View style={s.priceCard}>
          <Text style={s.priceAmount}>1,99 €</Text>
          <Text style={s.pricePeriod}>pro Monat · monatlich kündbar</Text>
        </View>
        <Pressable style={[s.btn, submitting && { opacity: 0.6 }]} onPress={startCheckout} disabled={submitting}>
          <ExternalLink color="#fff" size={18} />
          <Text style={s.btnText}>{submitting ? "Moment..." : "Mit PayPal abschließen"}</Text>
        </Pressable>
        <Text style={s.footnote}>Nach erfolgreicher Zahlung wird dein Brand-Modus automatisch aktiviert.</Text>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.iconBtn} hitSlop={10} accessibilityRole="button" accessibilityLabel="Zurueck">
          <ChevronLeft color={colors.white} size={26} strokeWidth={2} />
        </Pressable>
        <Text style={s.title} accessibilityRole="header">Brand-Profil</Text>
        <View style={s.iconBtn} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {renderBody()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function LabeledInput(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, style, multiline, ...rest } = props;
  return (
    <View style={s.inputGroup}>
      <Text style={s.inputLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.grayDark}
        {...rest}
        multiline={multiline}
        style={[s.input, multiline && { height: 90, textAlignVertical: "top" }, style]}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { color: colors.white, fontSize: 18, fontWeight: "600" },
  formContent: { padding: 24, paddingBottom: 60 },
  emoji: { fontSize: 48, textAlign: "center", marginBottom: 10 },
  headline: { color: colors.white, fontSize: 22, fontWeight: "700", marginBottom: 10, textAlign: "center" },
  body: { color: colors.gray, fontSize: 14, lineHeight: 21, textAlign: "center", marginBottom: 20 },
  inputGroup: { marginBottom: 14 },
  inputLabel: { color: colors.grayDark, fontSize: 12, marginBottom: 6, marginLeft: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, height: 48, color: colors.white, fontSize: 15 },
  btn: { flexDirection: "row", gap: 10, backgroundColor: colors.accent, borderRadius: 14, padding: 16, alignItems: "center", justifyContent: "center", marginTop: 10 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  footnote: { color: colors.grayDark, fontSize: 11, marginTop: 14, textAlign: "center", lineHeight: 16 },
  priceCard: { backgroundColor: colors.bgCard, borderRadius: 16, padding: 22, alignItems: "center", marginBottom: 20 },
  priceAmount: { color: colors.white, fontSize: 36, fontWeight: "800" },
  pricePeriod: { color: colors.gray, fontSize: 13, marginTop: 4 },
  statusCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.bgCard, padding: 16, borderRadius: 14, marginBottom: 14 },
  statusTitle: { color: colors.white, fontSize: 17, fontWeight: "700" },
  statusSub: { color: colors.gray, fontSize: 13, marginTop: 2 },
  brandCard: { backgroundColor: colors.bgCard, padding: 16, borderRadius: 14, marginBottom: 14 },
  brandName: { color: colors.white, fontSize: 20, fontWeight: "700", marginBottom: 6 },
  brandMeta: { color: colors.gray, fontSize: 13, marginBottom: 2 },
  brandLink: { color: colors.accent, fontSize: 13, marginTop: 4 },
  cancelBtn: { padding: 14, alignItems: "center", marginTop: 8 },
  cancelText: { color: "#EF4444", fontSize: 14 },
});
