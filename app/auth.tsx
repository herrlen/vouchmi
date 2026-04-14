import { useState, useMemo } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Check, Eye, EyeOff, Mail, Lock, User as UserIcon, KeyRound } from "lucide-react-native";
import { useAuth } from "../src/lib/store";
import { auth as authApi } from "../src/lib/api";
import { colors } from "../src/constants/theme";

type Mode = "login" | "register" | "forgot" | "reset";

function validatePassword(pw: string) {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    number: /[0-9]/.test(pw),
    valid: pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw),
  };
}

function validateEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export default function Auth() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [username, setUsername] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const router = useRouter();

  const pwCheck = useMemo(() => validatePassword(password), [password]);
  const emailValid = useMemo(() => validateEmail(email), [email]);

  const handleSubmit = async () => {
    if (mode === "forgot") {
      if (!emailValid) return Alert.alert("Fehler", "Bitte gib eine gültige E-Mail ein.");
      setLoading(true);
      try {
        await authApi.forgotPassword(email);
        Alert.alert("E-Mail gesendet", "Falls ein Konto mit dieser Adresse existiert, haben wir dir einen 6-stelligen Code gesendet.");
        setMode("reset");
      } catch (e: any) {
        Alert.alert("Fehler", e.message);
      } finally { setLoading(false); }
      return;
    }
    if (mode === "reset") {
      if (!emailValid || !resetToken || !pwCheck.valid)
        return Alert.alert("Fehler", "Bitte E-Mail, Code und ein gültiges Passwort eingeben.");
      setLoading(true);
      try {
        await authApi.resetPassword({ email, token: resetToken, password });
        Alert.alert("Erledigt", "Dein Passwort wurde zurückgesetzt. Bitte einloggen.");
        setMode("login");
        setPassword("");
        setResetToken("");
      } catch (e: any) {
        Alert.alert("Fehler", e.message);
      } finally { setLoading(false); }
      return;
    }
    if (!email || !password) return Alert.alert("Fehler", "Bitte alle Felder ausfüllen.");
    if (mode === "register") {
      if (!username) return Alert.alert("Fehler", "Username wird benötigt.");
      if (!pwCheck.valid) return Alert.alert("Fehler", "Passwort erfüllt nicht die Anforderungen.");
      if (!acceptTerms) return Alert.alert("Fehler", "Bitte akzeptiere die Nutzungsbedingungen.");
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

  const heading = mode === "login"
    ? "Anmeldung"
    : mode === "register"
    ? "Account erstellen"
    : mode === "forgot"
    ? "Passwort vergessen"
    : "Neues Passwort";

  const submitLabel = loading
    ? "Moment..."
    : mode === "login"
    ? "Einloggen"
    : mode === "register"
    ? "Registrieren"
    : mode === "forgot"
    ? "Code per E-Mail senden"
    : "Passwort zurücksetzen";

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.logo}>Vouchmi</Text>
        <Text style={s.tagline}>Community Commerce</Text>
        <Text style={s.subtitle}>{heading}</Text>

        <View style={s.form}>
          {mode === "register" && (
            <View style={s.inputWrap}>
              <UserIcon color={colors.grayDark} size={18} style={s.inputIcon} />
              <TextInput style={s.inputField} placeholder="Username" placeholderTextColor={colors.grayDark}
                value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
              {username.length >= 3 && <Check color={colors.accent} size={18} />}
            </View>
          )}

          <View style={s.inputWrap}>
            <Mail color={colors.grayDark} size={18} style={s.inputIcon} />
            <TextInput style={s.inputField} placeholder="E-Mail" placeholderTextColor={colors.grayDark}
              value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            {email.length > 3 && emailValid && <Check color={colors.accent} size={18} />}
          </View>

          {mode === "reset" && (
            <View style={s.inputWrap}>
              <KeyRound color={colors.grayDark} size={18} style={s.inputIcon} />
              <TextInput style={s.inputField} placeholder="6-stelliger Code" placeholderTextColor={colors.grayDark}
                value={resetToken} onChangeText={setResetToken} keyboardType="number-pad" maxLength={6} autoCapitalize="none" />
            </View>
          )}

          {(mode === "login" || mode === "register" || mode === "reset") && (
            <View>
              <View style={s.inputWrap}>
                <Lock color={colors.grayDark} size={18} style={s.inputIcon} />
                <TextInput style={s.inputField} placeholder={mode === "reset" ? "Neues Passwort" : "Passwort"} placeholderTextColor={colors.grayDark}
                  value={password} onChangeText={setPassword} secureTextEntry={!showPw} />
                <Pressable onPress={() => setShowPw(!showPw)} hitSlop={10}>
                  {showPw ? <EyeOff color={colors.gray} size={18} /> : <Eye color={colors.gray} size={18} />}
                </Pressable>
              </View>

              {(mode === "register" || mode === "reset") && password.length > 0 && (
                <View style={s.pwChecks}>
                  <PwRule ok={pwCheck.length} label="Min. 8 Zeichen" />
                  <PwRule ok={pwCheck.upper} label="1 Großbuchstabe" />
                  <PwRule ok={pwCheck.number} label="1 Zahl" />
                </View>
              )}
            </View>
          )}

          {mode === "register" && (
            <Pressable style={s.termsRow} onPress={() => setAcceptTerms((v) => !v)}>
              <View style={[s.checkbox, acceptTerms && s.checkboxOn]}>
                {acceptTerms && <Text style={s.checkmark}>✓</Text>}
              </View>
              <Text style={s.termsText}>
                Ich akzeptiere die{" "}
                <Text style={s.link} onPress={() => router.push("/legal/terms")}>Nutzungsbedingungen</Text>
                {" "}und die{" "}
                <Text style={s.link} onPress={() => router.push("/legal/privacy")}>Datenschutzerklärung</Text>.
              </Text>
            </Pressable>
          )}

          <Pressable style={[s.btn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading}>
            <Text style={s.btnText}>{submitLabel}</Text>
          </Pressable>

          {mode === "login" && (
            <Pressable onPress={() => setMode("forgot")} style={s.secondaryBtn}>
              <Text style={s.secondaryText}>Passwort vergessen?</Text>
            </Pressable>
          )}

          {(mode === "forgot" || mode === "reset") && (
            <Pressable onPress={() => setMode("login")} style={s.secondaryBtn}>
              <Text style={s.secondaryText}>Zurück zur Anmeldung</Text>
            </Pressable>
          )}

          {(mode === "login" || mode === "register") && (
            <Pressable onPress={() => setMode(mode === "register" ? "login" : "register")} style={s.toggle}>
              <Text style={s.toggleText}>
                {mode === "register" ? "Bereits dabei? Einloggen" : "Noch kein Account? Registrieren"}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PwRule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={s.pwRule}>
      <Check color={ok ? colors.accent : colors.grayDark} size={14} strokeWidth={ok ? 2.5 : 1.5} />
      <Text style={[s.pwRuleText, ok && { color: colors.accent }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 32 },
  logo: { color: colors.accent, fontSize: 42, fontWeight: "900", textAlign: "center", letterSpacing: -1 },
  tagline: { color: colors.gray, fontSize: 14, textAlign: "center", marginTop: 4, letterSpacing: 2, textTransform: "uppercase" },
  subtitle: { color: colors.white, fontSize: 22, fontWeight: "bold", textAlign: "center", marginTop: 40, marginBottom: 32 },
  form: { gap: 14 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgInput,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    height: 52,
    gap: 10,
  },
  inputIcon: { opacity: 0.7 },
  inputField: { flex: 1, color: colors.white, fontSize: 16 },
  pwChecks: { marginTop: 8, gap: 4, paddingLeft: 4 },
  pwRule: { flexDirection: "row", alignItems: "center", gap: 6 },
  pwRuleText: { color: colors.grayDark, fontSize: 12 },
  btn: { backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 4 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  secondaryBtn: { padding: 10, alignItems: "center" },
  secondaryText: { color: colors.gray, fontSize: 13 },
  toggle: { padding: 12 },
  toggleText: { color: colors.accent, textAlign: "center", fontSize: 14 },
  termsRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 6, gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border, marginTop: 2, justifyContent: "center", alignItems: "center" },
  checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkmark: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  termsText: { flex: 1, color: colors.gray, fontSize: 13, lineHeight: 19 },
  link: { color: colors.accent, textDecorationLine: "underline" },
});
