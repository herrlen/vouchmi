import { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Eye, EyeOff, Lock, ChevronLeft, AlertCircle } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { auth as authApi } from "../src/lib/api";

function getStrength(pw: string): { level: number; label: string; color: string } {
  if (pw.length < 8) return { level: 0, label: "Zu kurz", color: "#F472B6" };
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  const variety = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  if (pw.length >= 12 && variety >= 4) return { level: 3, label: "Stark", color: "#10B981" };
  if ((pw.length >= 8 && (hasSpecial || hasNumber)) || pw.length >= 12) return { level: 2, label: "Gut", color: "#F59E0B" };
  return { level: 1, label: "OK", color: "#F59E0B" };
}

export default function ResetPassword() {
  const params = useLocalSearchParams<{ token?: string; email?: string }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const email = Array.isArray(params.email) ? params.email[0] : params.email;

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => getStrength(pw), [pw]);
  const match = pw.length > 0 && pw === pw2;
  const canSubmit = strength.level >= 1 && match && !loading;
  const invalidLink = !token || !email;

  const submit = async () => {
    if (!canSubmit || invalidLink) return;
    setLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await authApi.resetPassword({ email: email!, token: token!, password: pw, password_confirmation: pw2 });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/auth?reset=success");
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = e.message ?? "";
      if (msg.includes("expired") || msg.includes("abgelaufen") || msg.includes("invalid") || msg.includes("ungültig")) {
        Alert.alert("Link abgelaufen", "Dieser Link ist nicht mehr gültig. Bitte fordere einen neuen Link an.", [
          { text: "Neuen Link anfordern", onPress: () => router.replace("/auth") },
        ]);
      } else {
        Alert.alert("Fehler", msg || "Konnte Passwort nicht ändern.");
      }
    } finally { setLoading(false); }
  };

  // Invalid link state
  if (invalidLink) {
    return (
      <SafeAreaView style={s.container} edges={["top", "bottom"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.centered}>
          <View style={s.errorIcon}>
            <AlertCircle color="#F472B6" size={40} strokeWidth={1.8} />
          </View>
          <Text style={s.title}>Ungültiger Link</Text>
          <Text style={s.body}>Dieser Link ist nicht gültig oder wurde bereits verwendet.</Text>
          <Pressable style={s.btn} onPress={() => router.replace("/auth")}>
            <Text style={s.btnText}>Neuen Link anfordern</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <Pressable style={s.backBtn} onPress={() => router.back()} hitSlop={10}>
        <ChevronLeft color="#FFFFFF" size={24} strokeWidth={2} />
      </Pressable>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          <View style={s.logoWrap}>
            <View style={s.logoMark}><Text style={s.logoV}>V</Text></View>
          </View>

          <Text style={s.title}>Neues Passwort setzen</Text>
          <Text style={s.body}>Wähle ein sicheres Passwort mit mindestens 8 Zeichen.</Text>

          {/* New password */}
          <View style={s.inputWrap}>
            <Lock color="#4A5068" size={18} />
            <TextInput style={s.inputField} placeholder="Neues Passwort" placeholderTextColor="#4A5068"
              value={pw} onChangeText={setPw} secureTextEntry={!showPw}
              autoCapitalize="none" textContentType="newPassword" />
            <Pressable onPress={() => setShowPw(!showPw)} hitSlop={10}>
              {showPw ? <EyeOff color="#64748B" size={18} /> : <Eye color="#64748B" size={18} />}
            </Pressable>
          </View>

          {/* Strength indicator */}
          {pw.length > 0 && (
            <View style={s.strengthWrap}>
              <View style={s.strengthBars}>
                {[1, 2, 3].map((i) => (
                  <View key={i} style={[s.strengthBar, { backgroundColor: i <= strength.level ? strength.color : "#1E2235" }]} />
                ))}
              </View>
              <Text style={[s.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
            </View>
          )}

          {/* Confirm password */}
          <View style={[s.inputWrap, { marginTop: 12 }]}>
            <Lock color="#4A5068" size={18} />
            <TextInput style={s.inputField} placeholder="Passwort bestätigen" placeholderTextColor="#4A5068"
              value={pw2} onChangeText={setPw2} secureTextEntry={!showPw2}
              autoCapitalize="none" textContentType="newPassword" />
            <Pressable onPress={() => setShowPw2(!showPw2)} hitSlop={10}>
              {showPw2 ? <EyeOff color="#64748B" size={18} /> : <Eye color="#64748B" size={18} />}
            </Pressable>
          </View>

          {pw2.length > 0 && !match && (
            <Text style={s.mismatch}>Passwörter stimmen nicht überein</Text>
          )}

          <Pressable style={[s.btn, !canSubmit && s.btnDisabled]} onPress={submit} disabled={!canSubmit}>
            {loading ? <ActivityIndicator color="#1A1D2E" /> : <Text style={s.btnText}>Passwort ändern</Text>}
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0E1A" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 32 },
  backBtn: { position: "absolute", top: 60, left: 16, zIndex: 10, width: 44, height: 44, justifyContent: "center" },

  logoWrap: { alignSelf: "center", marginBottom: 24 },
  logoMark: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#F59E0B", justifyContent: "center", alignItems: "center" },
  logoV: { color: "#1A1D2E", fontSize: 24, fontWeight: "800" },

  errorIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#F472B618", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  title: { color: "#FFFFFF", fontSize: 28, fontWeight: "800", textAlign: "center", marginBottom: 10 },
  body: { color: "#94A3B8", fontSize: 15, lineHeight: 22, textAlign: "center", marginBottom: 28 },

  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#141926", borderRadius: 14, paddingHorizontal: 14,
    borderWidth: 1, borderColor: "#1E2235", height: 52,
  },
  inputField: { flex: 1, color: "#FFFFFF", fontSize: 16 },

  strengthWrap: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8, paddingHorizontal: 4 },
  strengthBars: { flexDirection: "row", gap: 4, flex: 1 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontWeight: "700", width: 50, textAlign: "right" },

  mismatch: { color: "#F472B6", fontSize: 12, marginTop: 6, paddingHorizontal: 4 },

  btn: { backgroundColor: "#F59E0B", borderRadius: 14, height: 54, alignItems: "center", justifyContent: "center", marginTop: 20 },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#1A1D2E", fontSize: 16, fontWeight: "800" },
});
