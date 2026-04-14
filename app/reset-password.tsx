import { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Eye, EyeOff, Lock, Check, ShieldCheck } from "lucide-react-native";
import { auth as authApi } from "../src/lib/api";
import { colors } from "../src/constants/theme";

function validate(pw: string) {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    number: /[0-9]/.test(pw),
    valid: pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw),
  };
}

export default function ResetPassword() {
  const params = useLocalSearchParams<{ token?: string; email?: string }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const email = Array.isArray(params.email) ? params.email[0] : params.email;

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const check = useMemo(() => validate(pw), [pw]);
  const match = pw.length > 0 && pw === pw2;
  const invalidLink = !token || !email;

  const submit = async () => {
    if (invalidLink) return Alert.alert("Ungültiger Link", "Bitte fordere einen neuen Reset-Link an.");
    if (!check.valid) return Alert.alert("Fehler", "Passwort erfüllt nicht die Anforderungen.");
    if (!match) return Alert.alert("Fehler", "Die Passwörter stimmen nicht überein.");

    setLoading(true);
    try {
      await authApi.resetPassword({ email: email!, token: token!, password: pw, password_confirmation: pw2 });
      Alert.alert(
        "Passwort geändert",
        "Dein Passwort wurde zurückgesetzt. Bitte logge dich mit dem neuen Passwort ein.",
        [{ text: "OK", onPress: () => router.replace("/auth") }]
      );
    } catch (e: any) {
      Alert.alert("Fehler", e.message ?? "Konnte Passwort nicht ändern.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.iconBubble}>
            <ShieldCheck color={colors.accent} size={42} strokeWidth={1.8} />
          </View>
          <Text style={s.title}>Neues Passwort</Text>
          {invalidLink ? (
            <>
              <Text style={s.body}>
                Der Reset-Link ist unvollständig. Bitte fordere in der App unter „Passwort vergessen?" einen neuen Link an.
              </Text>
              <Pressable style={s.btn} onPress={() => router.replace("/auth")}>
                <Text style={s.btnText}>Zur Anmeldung</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={s.body}>Setze ein neues Passwort für <Text style={s.email}>{email}</Text>.</Text>

              <View style={s.inputWrap}>
                <Lock color={colors.grayDark} size={18} />
                <TextInput
                  style={s.inputField}
                  placeholder="Neues Passwort"
                  placeholderTextColor={colors.grayDark}
                  value={pw}
                  onChangeText={setPw}
                  secureTextEntry={!showPw}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowPw(!showPw)} hitSlop={10}>
                  {showPw ? <EyeOff color={colors.gray} size={18} /> : <Eye color={colors.gray} size={18} />}
                </Pressable>
              </View>

              <View style={s.inputWrap}>
                <Lock color={colors.grayDark} size={18} />
                <TextInput
                  style={s.inputField}
                  placeholder="Passwort wiederholen"
                  placeholderTextColor={colors.grayDark}
                  value={pw2}
                  onChangeText={setPw2}
                  secureTextEntry={!showPw}
                  autoCapitalize="none"
                />
                {match && <Check color={colors.accent} size={18} />}
              </View>

              {pw.length > 0 && (
                <View style={s.rules}>
                  <Rule ok={check.length} label="Min. 8 Zeichen" />
                  <Rule ok={check.upper} label="1 Großbuchstabe" />
                  <Rule ok={check.number} label="1 Zahl" />
                  <Rule ok={match} label="Passwörter stimmen überein" />
                </View>
              )}

              <Pressable
                style={[s.btn, (loading || !check.valid || !match) && { opacity: 0.6 }]}
                onPress={submit}
                disabled={loading || !check.valid || !match}
              >
                <Text style={s.btnText}>{loading ? "Moment..." : "Passwort ändern"}</Text>
              </Pressable>

              <Pressable onPress={() => router.replace("/auth")} style={s.secondaryBtn}>
                <Text style={s.secondaryText}>Zurück zur Anmeldung</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Rule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={s.rule}>
      <Check color={ok ? colors.accent : colors.grayDark} size={14} strokeWidth={ok ? 2.5 : 1.5} />
      <Text style={[s.ruleText, ok && { color: colors.accent }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 32 },
  iconBubble: { alignSelf: "center", width: 84, height: 84, borderRadius: 42, backgroundColor: colors.bgCard, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  title: { color: colors.white, fontSize: 26, fontWeight: "800", textAlign: "center", marginBottom: 10 },
  body: { color: colors.gray, fontSize: 14, lineHeight: 22, textAlign: "center", marginBottom: 24 },
  email: { color: colors.white, fontWeight: "600" },
  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: colors.bgInput, borderRadius: 12, paddingHorizontal: 14,
    borderWidth: 1, borderColor: colors.border, height: 52, marginBottom: 12,
  },
  inputField: { flex: 1, color: colors.white, fontSize: 16 },
  rules: { gap: 4, paddingLeft: 4, marginBottom: 10 },
  rule: { flexDirection: "row", alignItems: "center", gap: 6 },
  ruleText: { color: colors.grayDark, fontSize: 12 },
  btn: { backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  secondaryBtn: { padding: 12, alignItems: "center" },
  secondaryText: { color: colors.gray, fontSize: 13 },
});
