import { useState, useMemo } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Linking } from "react-native";
import { useRouter } from "expo-router";
import { Check, Eye, EyeOff, Mail, Lock, User as UserIcon } from "lucide-react-native";
import { useAuth } from "../src/lib/store";
import { colors } from "../src/constants/theme";

type Mode = "login" | "register" | "magic" | "forgot";

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
  const [username, setUsername] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const { login, register } = useAuth();
  const router = useRouter();

  const pwCheck = useMemo(() => validatePassword(password), [password]);
  const emailValid = useMemo(() => validateEmail(email), [email]);

  const handleSubmit = async () => {
    if (mode === "magic") {
      if (!emailValid) return Alert.alert("Fehler", "Bitte gib eine gültige E-Mail ein.");
      setMagicSent(true);
      return;
    }
    if (mode === "forgot") {
      if (!emailValid) return Alert.alert("Fehler", "Bitte gib eine gültige E-Mail ein.");
      setForgotSent(true);
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

  if (magicSent) {
    return (
      <View style={[s.container, s.centerContent]}>
        <Mail color={colors.accent} size={56} strokeWidth={1.5} />
        <Text style={s.sentTitle}>Prüfe dein Postfach</Text>
        <Text style={s.sentText}>Wir haben dir einen Login-Link an {email} gesendet. Klicke auf den Link, um dich anzumelden.</Text>
        <Pressable style={s.sentBtn} onPress={() => { setMagicSent(false); setMode("login"); }}>
          <Text style={s.sentBtnText}>Zurück zum Login</Text>
        </Pressable>
      </View>
    );
  }

  if (forgotSent) {
    return (
      <View style={[s.container, s.centerContent]}>
        <Mail color={colors.accent} size={56} strokeWidth={1.5} />
        <Text style={s.sentTitle}>E-Mail gesendet</Text>
        <Text style={s.sentText}>Falls ein Konto mit {email} existiert, haben wir dir einen Link zum Zurücksetzen gesendet.</Text>
        <Pressable style={s.sentBtn} onPress={() => { setForgotSent(false); setMode("login"); }}>
          <Text style={s.sentBtnText}>Zurück zum Login</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.logo}>Vouchmi</Text>
        <Text style={s.tagline}>Community Commerce</Text>
        <Text style={s.subtitle}>
          {mode === "login" ? "Willkommen zurück" : mode === "register" ? "Account erstellen" : mode === "magic" ? "Magic Link" : "Passwort zurücksetzen"}
        </Text>

        <View style={s.form}>
          {mode === "register" && (
            <View>
              <View style={s.inputWrap}>
                <UserIcon color={colors.grayDark} size={18} style={s.inputIcon} />
                <TextInput style={s.inputField} placeholder="Username" placeholderTextColor={colors.grayDark}
                  value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
                {username.length >= 3 && <Check color={colors.accent} size={18} />}
              </View>
            </View>
          )}

          <View style={s.inputWrap}>
            <Mail color={colors.grayDark} size={18} style={s.inputIcon} />
            <TextInput style={s.inputField} placeholder="E-Mail" placeholderTextColor={colors.grayDark}
              value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            {email.length > 3 && emailValid && <Check color={colors.accent} size={18} />}
          </View>

          {(mode === "login" || mode === "register") && (
            <View>
              <View style={s.inputWrap}>
                <Lock color={colors.grayDark} size={18} style={s.inputIcon} />
                <TextInput style={s.inputField} placeholder="Passwort" placeholderTextColor={colors.grayDark}
                  value={password} onChangeText={setPassword} secureTextEntry={!showPw} />
                <Pressable onPress={() => setShowPw(!showPw)} hitSlop={10}>
                  {showPw ? <EyeOff color={colors.gray} size={18} /> : <Eye color={colors.gray} size={18} />}
                </Pressable>
              </View>

              {mode === "register" && password.length > 0 && (
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
                <Text style={s.link} onPress={() => Linking.openURL("https://vouchmi.com/terms")}>Nutzungsbedingungen</Text>
                {" "}und die{" "}
                <Text style={s.link} onPress={() => Linking.openURL("https://vouchmi.com/privacy")}>Datenschutzerklärung</Text>.
              </Text>
            </Pressable>
          )}

          <Pressable style={[s.btn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading}>
            <Text style={s.btnText}>
              {loading ? "Moment..." : mode === "login" ? "Einloggen" : mode === "register" ? "Registrieren" : mode === "magic" ? "Magic Link senden" : "Link senden"}
            </Text>
          </Pressable>

          {mode === "login" && (
            <>
              <Pressable onPress={() => setMode("forgot")} style={s.secondaryBtn}>
                <Text style={s.secondaryText}>Passwort vergessen?</Text>
              </Pressable>
              <View style={s.divider}><View style={s.dividerLine} /><Text style={s.dividerText}>oder</Text><View style={s.dividerLine} /></View>
              <Pressable style={s.magicBtn} onPress={() => setMode("magic")}>
                <Mail color={colors.accent} size={18} />
                <Text style={s.magicBtnText}>Magic Link per E-Mail</Text>
              </Pressable>
            </>
          )}

          <Pressable onPress={() => setMode(mode === "register" ? "login" : "register")} style={s.toggle}>
            <Text style={s.toggleText}>
              {mode === "register" ? "Bereits dabei? Einloggen" : "Noch kein Account? Registrieren"}
            </Text>
          </Pressable>
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
  centerContent: { justifyContent: "center", alignItems: "center", padding: 32 },
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
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 4 },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: colors.border },
  dividerText: { color: colors.grayDark, fontSize: 12 },
  magicBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: colors.bgCard, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border },
  magicBtnText: { color: colors.accent, fontSize: 15, fontWeight: "600" },
  toggle: { padding: 12 },
  toggleText: { color: colors.accent, textAlign: "center", fontSize: 14 },
  termsRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 6, gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border, marginTop: 2, justifyContent: "center", alignItems: "center" },
  checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkmark: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  termsText: { flex: 1, color: colors.gray, fontSize: 13, lineHeight: 19 },
  link: { color: colors.accent, textDecorationLine: "underline" },
  sentTitle: { color: colors.white, fontSize: 22, fontWeight: "700", marginTop: 20, marginBottom: 10 },
  sentText: { color: colors.gray, fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  sentBtn: { backgroundColor: colors.bgCard, borderRadius: 12, padding: 16, paddingHorizontal: 32 },
  sentBtnText: { color: colors.white, fontSize: 15, fontWeight: "600" },
});
