// app/auth.tsx
import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Linking } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../src/lib/store";
import { colors } from "../src/constants/theme";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!email || !password) return Alert.alert("Fehler", "Bitte alle Felder ausfüllen");
    if (mode === "register" && !username) return Alert.alert("Fehler", "Username wird benötigt");
    if (mode === "register" && !acceptTerms) {
      return Alert.alert("Fehler", "Bitte akzeptiere die Nutzungsbedingungen und Datenschutzerklärung.");
    }
    setLoading(true);
    try {
      if (mode === "register") await register(email, password, username, acceptTerms);
      else await login(email, password);
      router.replace("/");
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.logo}>TrusCart</Text>
        <Text style={s.tagline}>Community Commerce</Text>
        <Text style={s.subtitle}>{mode === "login" ? "Willkommen zurück" : "Account erstellen"}</Text>

        <View style={s.form}>
          {mode === "register" && (
            <TextInput style={s.input} placeholder="Username" placeholderTextColor={colors.grayDark}
              value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
          )}
          <TextInput style={s.input} placeholder="E-Mail" placeholderTextColor={colors.grayDark}
            value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          <TextInput style={s.input} placeholder="Passwort" placeholderTextColor={colors.grayDark}
            value={password} onChangeText={setPassword} secureTextEntry />

          {mode === "register" && (
            <Pressable style={s.termsRow} onPress={() => setAcceptTerms((v) => !v)}>
              <View style={[s.checkbox, acceptTerms && s.checkboxOn]}>
                {acceptTerms && <Text style={s.checkmark}>✓</Text>}
              </View>
              <Text style={s.termsText}>
                Ich akzeptiere die{" "}
                <Text style={s.link} onPress={() => Linking.openURL("https://truscart.com/terms")}>Nutzungsbedingungen</Text>
                {" "}und die{" "}
                <Text style={s.link} onPress={() => Linking.openURL("https://truscart.com/privacy")}>Datenschutzerklärung</Text>.
              </Text>
            </Pressable>
          )}

          <Pressable style={[s.btn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading}>
            <Text style={s.btnText}>{loading ? "Moment..." : mode === "login" ? "Einloggen" : "Registrieren"}</Text>
          </Pressable>

          <Pressable onPress={() => setMode(mode === "login" ? "register" : "login")} style={s.toggle}>
            <Text style={s.toggleText}>
              {mode === "login" ? "Noch kein Account? Registrieren" : "Bereits dabei? Einloggen"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 32 },
  logo: { color: colors.accent, fontSize: 42, fontWeight: "900", textAlign: "center", letterSpacing: -1 },
  tagline: { color: colors.gray, fontSize: 14, textAlign: "center", marginTop: 4, letterSpacing: 2, textTransform: "uppercase" },
  subtitle: { color: colors.white, fontSize: 22, fontWeight: "bold", textAlign: "center", marginTop: 40, marginBottom: 32 },
  form: { gap: 14 },
  input: { backgroundColor: colors.bgInput, borderRadius: 12, padding: 16, color: colors.white, fontSize: 16, borderWidth: 1, borderColor: colors.border },
  btn: { backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8 },
  btnText: { color: colors.bg, fontSize: 16, fontWeight: "bold" },
  toggle: { padding: 12 },
  toggleText: { color: colors.accent, textAlign: "center", fontSize: 14 },
  termsRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 6, gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border, marginTop: 2, justifyContent: "center", alignItems: "center" },
  checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkmark: { color: colors.bg, fontWeight: "bold", fontSize: 14 },
  termsText: { flex: 1, color: colors.gray, fontSize: 13, lineHeight: 19 },
  link: { color: colors.accent, textDecorationLine: "underline" },
});
