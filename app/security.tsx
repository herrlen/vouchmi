import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { ChevronLeft, Shield, Smartphone, KeyRound, Copy, Check } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { colors } from "../src/constants/theme";

type TwoFAMethod = "none" | "sms" | "authenticator";
type Step = "overview" | "choose" | "sms-enter" | "sms-verify" | "auth-qr" | "auth-verify" | "backup-codes";

const BACKUP_CODES = Array.from({ length: 10 }, () =>
  Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase()
);

export default function SecurityScreen() {
  const [activeMethod, setActiveMethod] = useState<TwoFAMethod>("none");
  const [step, setStep] = useState<Step>("overview");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+49");
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [copied, setCopied] = useState(false);

  const startCountdown = () => {
    setCountdown(60);
    const iv = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { clearInterval(iv); return 0; } return c - 1; });
    }, 1000);
  };

  const verifySMS = () => {
    if (code.length !== 6) return Alert.alert("Fehler", "Bitte gib den 6-stelligen Code ein.");
    setActiveMethod("sms");
    setStep("overview");
    Alert.alert("Aktiviert", "2FA per SMS ist jetzt aktiv.");
  };

  const verifyAuth = () => {
    if (code.length !== 6) return Alert.alert("Fehler", "Bitte gib den 6-stelligen Code ein.");
    setActiveMethod("authenticator");
    setStep("backup-codes");
  };

  const copyBackupCodes = async () => {
    await Clipboard.setStringAsync(BACKUP_CODES.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const disable2FA = () => {
    Alert.alert("2FA deaktivieren", "Möchtest du die Zwei-Faktor-Authentifizierung wirklich deaktivieren?", [
      { text: "Abbrechen", style: "cancel" },
      { text: "Deaktivieren", style: "destructive", onPress: () => { setActiveMethod("none"); setStep("overview"); }},
    ]);
  };

  // Overview
  if (step === "overview") {
    return (
      <SafeAreaView style={s.container} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10} accessibilityRole="button" accessibilityLabel="Zurueck"><ChevronLeft color={colors.white} size={24} strokeWidth={2} /></Pressable>
          <Text style={s.headerTitle} accessibilityRole="header">Sicherheit</Text>
          <View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={s.statusCard}>
            <Shield color={activeMethod !== "none" ? colors.accent : colors.grayDark} size={32} strokeWidth={1.8} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={s.statusTitle}>Zwei-Faktor-Authentifizierung</Text>
              <Text style={[s.statusBadge, activeMethod !== "none" && s.statusBadgeOn]}>
                {activeMethod === "none" ? "Nicht aktiv" : activeMethod === "sms" ? "SMS aktiv" : "Authenticator aktiv"}
              </Text>
            </View>
          </View>

          {activeMethod === "none" ? (
            <>
              <Text style={s.infoText}>Schütze dein Konto mit einem zusätzlichen Verifizierungsschritt beim Login.</Text>
              <Pressable style={s.primaryBtn} onPress={() => setStep("choose")} accessibilityRole="button" accessibilityLabel="Zwei-Faktor-Authentifizierung einrichten">
                <Text style={s.primaryBtnText}>2FA einrichten</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={s.infoText}>Dein Konto ist mit 2FA geschützt. Du kannst die Methode wechseln oder deaktivieren.</Text>
              <Pressable style={s.optionBtn} onPress={() => setStep("choose")}>
                <Text style={s.optionBtnText}>Methode wechseln</Text>
              </Pressable>
              {activeMethod === "authenticator" && (
                <Pressable style={s.optionBtn} onPress={() => setStep("backup-codes")}>
                  <Text style={s.optionBtnText}>Backup-Codes anzeigen</Text>
                </Pressable>
              )}
              <Pressable style={s.dangerBtn} onPress={disable2FA} accessibilityRole="button" accessibilityLabel="Zwei-Faktor-Authentifizierung deaktivieren">
                <Text style={s.dangerBtnText}>2FA deaktivieren</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Choose method
  if (step === "choose") {
    return (
      <SafeAreaView style={s.container} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.header}>
          <Pressable onPress={() => setStep("overview")} style={s.backBtn} hitSlop={10} accessibilityRole="button" accessibilityLabel="Zurueck"><ChevronLeft color={colors.white} size={24} strokeWidth={2} /></Pressable>
          <Text style={s.headerTitle} accessibilityRole="header">Methode wählen</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={{ padding: 16, gap: 12 }}>
          <Pressable style={s.methodCard} onPress={() => { setStep("sms-enter"); setCode(""); }} accessible accessibilityRole="button" accessibilityLabel="SMS-Verifizierung: Code per SMS an deine Handynummer">
            <Smartphone color={colors.accent} size={28} strokeWidth={1.8} />
            <View style={{ flex: 1 }}>
              <Text style={s.methodTitle}>SMS-Verifizierung</Text>
              <Text style={s.methodSub}>Code per SMS an deine Handynummer</Text>
            </View>
          </Pressable>
          <Pressable style={s.methodCard} onPress={() => { setStep("auth-qr"); setCode(""); }} accessible accessibilityRole="button" accessibilityLabel="Authenticator-App: Google Authenticator, Authy oder aehnliche">
            <KeyRound color={colors.accent} size={28} strokeWidth={1.8} />
            <View style={{ flex: 1 }}>
              <Text style={s.methodTitle}>Authenticator-App</Text>
              <Text style={s.methodSub}>Google Authenticator, Authy oder ähnliche</Text>
            </View>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // SMS Enter Phone
  if (step === "sms-enter") {
    return (
      <SafeAreaView style={s.container} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.header}>
          <Pressable onPress={() => setStep("choose")} style={s.backBtn} hitSlop={10}><ChevronLeft color={colors.white} size={24} strokeWidth={2} /></Pressable>
          <Text style={s.headerTitle}>SMS-Verifizierung</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={{ padding: 16 }}>
          <Text style={s.stepLabel}>Telefonnummer eingeben</Text>
          <View style={s.phoneRow}>
            <Pressable style={s.countryBtn}><Text style={s.countryText}>{countryCode}</Text></Pressable>
            <TextInput style={s.phoneInput} placeholder="Handynummer" placeholderTextColor={colors.gray}
              value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          </View>
          <Pressable style={[s.primaryBtn, !phone && { opacity: 0.4 }]} disabled={!phone}
            onPress={() => { setStep("sms-verify"); startCountdown(); }}>
            <Text style={s.primaryBtnText}>Code senden</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // SMS Verify Code
  if (step === "sms-verify") {
    return (
      <SafeAreaView style={s.container} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.header}>
          <Pressable onPress={() => setStep("sms-enter")} style={s.backBtn} hitSlop={10}><ChevronLeft color={colors.white} size={24} strokeWidth={2} /></Pressable>
          <Text style={s.headerTitle}>Code eingeben</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={{ padding: 16 }}>
          <Text style={s.stepLabel}>6-stelliger Code per SMS an {countryCode}{phone}</Text>
          <TextInput style={s.codeInput} placeholder="000000" placeholderTextColor={colors.grayDark}
            value={code} onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" maxLength={6} />
          <Pressable style={[s.primaryBtn, code.length !== 6 && { opacity: 0.4 }]} disabled={code.length !== 6} onPress={verifySMS}>
            <Text style={s.primaryBtnText}>Bestätigen</Text>
          </Pressable>
          <Pressable style={s.resendBtn} disabled={countdown > 0} onPress={startCountdown}>
            <Text style={[s.resendText, countdown > 0 && { color: colors.grayDark }]}>
              {countdown > 0 ? `Erneut senden (${countdown}s)` : "Code erneut senden"}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Authenticator QR
  if (step === "auth-qr") {
    const secret = "JBSWY3DPEHPK3PXP";
    return (
      <SafeAreaView style={s.container} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.header}>
          <Pressable onPress={() => setStep("choose")} style={s.backBtn} hitSlop={10}><ChevronLeft color={colors.white} size={24} strokeWidth={2} /></Pressable>
          <Text style={s.headerTitle}>Authenticator-App</Text>
          <View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, alignItems: "center" }}>
          <Text style={s.stepLabel}>Scanne den QR-Code mit deiner Authenticator-App</Text>
          <View style={s.qrPlaceholder}>
            <KeyRound color={colors.accent} size={48} strokeWidth={1.2} />
            <Text style={s.qrPlaceholderText}>QR-Code</Text>
          </View>
          <Text style={s.secretLabel}>Oder gib den Schlüssel manuell ein:</Text>
          <Pressable style={s.secretBox} onPress={async () => { await Clipboard.setStringAsync(secret); Alert.alert("Kopiert"); }}>
            <Text style={s.secretText}>{secret}</Text>
            <Copy color={colors.gray} size={16} />
          </Pressable>
          <Pressable style={s.primaryBtn} onPress={() => { setStep("auth-verify"); setCode(""); }}>
            <Text style={s.primaryBtnText}>Weiter</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Authenticator Verify
  if (step === "auth-verify") {
    return (
      <SafeAreaView style={s.container} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.header}>
          <Pressable onPress={() => setStep("auth-qr")} style={s.backBtn} hitSlop={10}><ChevronLeft color={colors.white} size={24} strokeWidth={2} /></Pressable>
          <Text style={s.headerTitle}>Code bestätigen</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={{ padding: 16 }}>
          <Text style={s.stepLabel}>Gib den 6-stelligen Code aus deiner Authenticator-App ein</Text>
          <TextInput style={s.codeInput} placeholder="000000" placeholderTextColor={colors.grayDark}
            value={code} onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" maxLength={6} />
          <Pressable style={[s.primaryBtn, code.length !== 6 && { opacity: 0.4 }]} disabled={code.length !== 6} onPress={verifyAuth}>
            <Text style={s.primaryBtnText}>Aktivieren</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Backup Codes
  if (step === "backup-codes") {
    return (
      <SafeAreaView style={s.container} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.header}>
          <Pressable onPress={() => setStep("overview")} style={s.backBtn} hitSlop={10}><ChevronLeft color={colors.white} size={24} strokeWidth={2} /></Pressable>
          <Text style={s.headerTitle}>Backup-Codes</Text>
          <View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={s.warningText}>Speichere diese Codes sicher ab. Sie können jeweils einmal verwendet werden, falls du keinen Zugriff auf deine 2FA-Methode hast.</Text>
          <View style={s.codesGrid}>
            {BACKUP_CODES.map((c, i) => (
              <View key={i} style={s.codeChip}><Text style={s.codeChipText}>{c}</Text></View>
            ))}
          </View>
          <Pressable style={s.primaryBtn} onPress={copyBackupCodes}>
            {copied ? <Check color={colors.bg} size={18} /> : <Copy color={colors.bg} size={18} />}
            <Text style={s.primaryBtnText}>{copied ? "Kopiert!" : "Alle Codes kopieren"}</Text>
          </Pressable>
          <Pressable style={[s.optionBtn, { marginTop: 12 }]} onPress={() => setStep("overview")}>
            <Text style={s.optionBtnText}>Fertig</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, gap: 10 },
  backBtn: { minWidth: 44, minHeight: 44, justifyContent: "center" },
  headerTitle: { flex: 1, color: colors.white, fontSize: 17, fontWeight: "600" },
  statusCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, marginBottom: 16 },
  statusTitle: { color: colors.white, fontSize: 15, fontWeight: "600" },
  statusBadge: { color: colors.grayDark, fontSize: 12, marginTop: 2, fontWeight: "500" },
  statusBadgeOn: { color: colors.accent },
  infoText: { color: colors.gray, fontSize: 14, lineHeight: 20, marginBottom: 20 },
  primaryBtn: { backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, minHeight: 50 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  optionBtn: { backgroundColor: colors.bgCard, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8, minHeight: 50, justifyContent: "center" },
  optionBtnText: { color: colors.white, fontSize: 15, fontWeight: "600" },
  dangerBtn: { padding: 16, alignItems: "center", marginTop: 16 },
  dangerBtnText: { color: "#EF4444", fontSize: 15 },
  methodCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, minHeight: 70 },
  methodTitle: { color: colors.white, fontSize: 16, fontWeight: "600" },
  methodSub: { color: colors.gray, fontSize: 13, marginTop: 2 },
  stepLabel: { color: colors.gray, fontSize: 14, lineHeight: 20, marginBottom: 16 },
  phoneRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  countryBtn: { backgroundColor: colors.bgInput, borderRadius: 12, paddingHorizontal: 16, justifyContent: "center", minHeight: 52, borderWidth: 1, borderColor: colors.border },
  countryText: { color: colors.white, fontSize: 16, fontWeight: "600" },
  phoneInput: { flex: 1, backgroundColor: colors.bgInput, borderRadius: 12, paddingHorizontal: 16, color: colors.white, fontSize: 16, borderWidth: 1, borderColor: colors.border, minHeight: 52 },
  codeInput: { backgroundColor: colors.bgInput, borderRadius: 12, padding: 16, color: colors.white, fontSize: 28, fontWeight: "700", textAlign: "center", letterSpacing: 8, borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
  resendBtn: { padding: 14, alignItems: "center" },
  resendText: { color: colors.accent, fontSize: 14 },
  qrPlaceholder: { width: 200, height: 200, backgroundColor: colors.bgCard, borderRadius: 16, justifyContent: "center", alignItems: "center", marginVertical: 20, borderWidth: 1, borderColor: colors.border },
  qrPlaceholderText: { color: colors.gray, fontSize: 12, marginTop: 8 },
  secretLabel: { color: colors.gray, fontSize: 13, marginBottom: 8 },
  secretBox: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.bgCard, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20 },
  secretText: { color: colors.white, fontSize: 16, fontWeight: "600", letterSpacing: 2, flex: 1 },
  warningText: { color: colors.gold, fontSize: 13, lineHeight: 19, marginBottom: 16, backgroundColor: colors.bgCard, padding: 14, borderRadius: 12, borderLeftWidth: 3, borderLeftColor: colors.gold },
  codesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  codeChip: { backgroundColor: colors.bgCard, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  codeChipText: { color: colors.white, fontSize: 14, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", letterSpacing: 1 },
});
