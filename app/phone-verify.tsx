import { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { ChevronLeft, ShieldCheck } from "lucide-react-native";
import { auth as authApi } from "../src/lib/api";
import { useAuth } from "../src/lib/store";
import { colors } from "../src/constants/theme";

type Step = "enter-phone" | "enter-code" | "done";

export default function PhoneVerify() {
  const params = useLocalSearchParams<{ required?: string }>();
  const isRequired = params.required === "1";
  const refresh = useAuth((s) => s.init);
  const [step, setStep] = useState<Step>("enter-phone");
  const [phone, setPhone] = useState("+49");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    if (!/^\+[1-9]\d{6,15}$/.test(phone)) {
      Alert.alert("Ungültig", "Bitte Nummer im Format +491711234567 eingeben.");
      return;
    }
    setBusy(true);
    try {
      await authApi.sendPhoneCode(phone);
      setStep("enter-code");
    } catch (e: any) {
      Alert.alert("Fehler", e.message ?? "Code konnte nicht gesendet werden.");
    }
    setBusy(false);
  };

  const verifyCode = async () => {
    if (!/^\d{4,8}$/.test(code)) {
      Alert.alert("Ungültig", "Code besteht aus 4–8 Ziffern.");
      return;
    }
    setBusy(true);
    try {
      await authApi.verifyPhoneCode(code);
      await refresh().catch(() => {});
      setStep("done");
    } catch (e: any) {
      Alert.alert("Fehler", e.message ?? "Code ungültig oder abgelaufen.");
    }
    setBusy(false);
  };

  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.header}>
        {isRequired ? (
          <View style={s.backBtn} />
        ) : (
          <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
            <ChevronLeft color={colors.white} size={24} strokeWidth={2} />
          </Pressable>
        )}
        <Text style={s.headerTitle}>Telefon verifizieren</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={s.content}>
          {step === "enter-phone" && (
            <>
              <ShieldCheck color={colors.accent} size={56} strokeWidth={1.6} style={{ alignSelf: "center", marginBottom: 18 }} />
              <Text style={s.title}>Bestätige deine Nummer</Text>
              <Text style={s.body}>
                Wir senden dir einen 6-stelligen Code per SMS. Verifizierte Nummern bekommen ein Verified-Siegel im Profil.
              </Text>
              <Text style={s.label}>Telefonnummer</Text>
              <TextInput
                style={s.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+491711234567"
                placeholderTextColor={colors.grayDark}
                keyboardType="phone-pad"
                autoFocus
              />
              <Pressable style={[s.btn, busy && { opacity: 0.5 }]} onPress={sendCode} disabled={busy}>
                {busy ? <ActivityIndicator color="#1A1D2E" /> : <Text style={s.btnText}>Code senden</Text>}
              </Pressable>
            </>
          )}

          {step === "enter-code" && (
            <>
              <Text style={s.title}>Code eingeben</Text>
              <Text style={s.body}>
                SMS an {phone} versendet. Gib den Code ein (gilt 10 Min).
              </Text>
              <Text style={s.label}>Code</Text>
              <TextInput
                style={[s.input, { letterSpacing: 8, textAlign: "center", fontSize: 22 }]}
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                placeholderTextColor={colors.grayDark}
                keyboardType="number-pad"
                maxLength={8}
                autoFocus
              />
              <Pressable style={[s.btn, busy && { opacity: 0.5 }]} onPress={verifyCode} disabled={busy}>
                {busy ? <ActivityIndicator color="#1A1D2E" /> : <Text style={s.btnText}>Bestätigen</Text>}
              </Pressable>
              <Pressable onPress={() => setStep("enter-phone")} style={s.secondaryBtn}>
                <Text style={s.secondaryText}>Andere Nummer</Text>
              </Pressable>
            </>
          )}

          {step === "done" && (
            <>
              <ShieldCheck color="#10B981" size={64} strokeWidth={1.6} style={{ alignSelf: "center", marginBottom: 18 }} />
              <Text style={s.title}>Verifiziert</Text>
              <Text style={s.body}>
                Dein Profil zeigt jetzt das Verified-Siegel.
              </Text>
              <Pressable style={s.btn} onPress={() => isRequired ? router.replace("/") : router.back()}>
                <Text style={s.btnText}>{isRequired ? "Weiter zur App" : "Fertig"}</Text>
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, gap: 10 },
  backBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  headerTitle: { flex: 1, color: colors.white, fontSize: 17, fontWeight: "600" },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 30, gap: 12 },
  title: { color: colors.white, fontSize: 24, fontWeight: "800", textAlign: "center", marginBottom: 8 },
  body: { color: "#94A3B8", fontSize: 14, lineHeight: 21, textAlign: "center", marginBottom: 24 },
  label: { color: "#94A3B8", fontSize: 12, fontWeight: "600", marginTop: 8, letterSpacing: 1 },
  input: { backgroundColor: colors.bgInput, color: colors.white, fontSize: 16, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12 },
  btn: { backgroundColor: colors.accent, height: 50, borderRadius: 14, justifyContent: "center", alignItems: "center", marginTop: 16 },
  btnText: { color: "#1A1D2E", fontSize: 15, fontWeight: "800" },
  secondaryBtn: { paddingVertical: 12, alignItems: "center" },
  secondaryText: { color: colors.gray, fontSize: 14 },
});
