import { useState, useMemo, useEffect } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Check, Eye, EyeOff, Mail, Lock, User as UserIcon, CheckCircle, ChevronLeft } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAuth } from "../src/lib/store";
import { auth as authApi } from "../src/lib/api";
import { colors } from "../src/constants/theme";

type Mode = "login" | "register" | "forgot" | "forgot-sent";

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
  const params = useLocalSearchParams<{ reset?: string }>();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [showResetBanner, setShowResetBanner] = useState(params.reset === "success");
  const { login, register } = useAuth();
  const router = useRouter();

  const pwCheck = useMemo(() => validatePassword(password), [password]);
  const emailValid = useMemo(() => validateEmail(email), [email]);

  // Reset success banner auto-hide
  useEffect(() => {
    if (showResetBanner) {
      const t = setTimeout(() => setShowResetBanner(false), 5000);
      return () => clearTimeout(t);
    }
  }, [showResetBanner]);

  // Cooldown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleSubmit = async () => {
    if (mode === "forgot") {
      if (!emailValid) return Alert.alert("Fehler", "Bitte gib eine gültige E-Mail ein.");
      setLoading(true);
      try {
        await authApi.forgotPassword(email);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setMode("forgot-sent");
        setCooldown(60);
      } catch {
        // Always show success (user enumeration protection)
        setMode("forgot-sent");
        setCooldown(60);
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (mode === "register") await register(email, password, username, acceptTerms);
      else await login(email, password);
      router.replace("/");
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setCooldown(60);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {} finally { setLoading(false); }
  };

  // Forgot-sent success state
  if (mode === "forgot-sent") {
    return (
      <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.successIcon}>
            <CheckCircle color="#10B981" size={40} strokeWidth={1.8} />
          </View>
          <Text style={s.title}>Check deinen Posteingang</Text>
          <Text style={s.body}>
            Wenn ein Konto mit <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>{email}</Text> existiert, haben wir dir einen Link zum Zurücksetzen geschickt. Der Link ist 60 Minuten gültig.
          </Text>
          <Pressable style={s.btn} onPress={() => { setMode("login"); setPassword(""); }}>
            <Text style={s.btnText}>Zurück zur Anmeldung</Text>
          </Pressable>
          <Pressable style={s.secondaryBtn} onPress={handleResend} disabled={cooldown > 0}>
            <Text style={[s.secondaryText, { color: cooldown > 0 ? "#4A5068" : colors.accent }]}>
              {cooldown > 0 ? `Erneut senden in ${cooldown}s` : "Keine Mail erhalten? Erneut senden"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  const heading = mode === "login" ? "Anmeldung" : mode === "register" ? "Account erstellen" : "Passwort vergessen?";
  const submitLabel = mode === "login" ? "Einloggen" : mode === "register" ? "Registrieren" : "Link senden";

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Reset success banner */}
        {showResetBanner && (
          <View style={s.resetBanner}>
            <CheckCircle color="#10B981" size={18} strokeWidth={2} />
            <Text style={s.resetBannerText}>Passwort erfolgreich geändert. Jetzt anmelden.</Text>
          </View>
        )}

        {/* Logo */}
        <View style={s.logoWrap}>
          <View style={s.logoMark}><Text style={s.logoV}>V</Text></View>
        </View>
        <Text style={s.logo}>Vouch<Text style={{ opacity: 0.5 }}>mi</Text></Text>
        <Text style={s.tagline}>Community Commerce</Text>

        {/* Back button for forgot mode */}
        {mode === "forgot" && (
          <Pressable style={s.backRow} onPress={() => setMode("login")}>
            <ChevronLeft color="#94A3B8" size={18} />
            <Text style={s.backText}>Zurück zur Anmeldung</Text>
          </Pressable>
        )}

        <Text style={s.subtitle}>{heading}</Text>
        {mode === "forgot" && (
          <Text style={s.forgotBody}>Kein Problem. Gib deine E-Mail ein und wir senden dir einen Link zum Zurücksetzen.</Text>
        )}

        <View style={s.form}>
          {mode === "register" && (
            <View style={s.inputWrap}>
              <UserIcon color="#4A5068" size={18} style={s.inputIcon} />
              <TextInput style={s.inputField} placeholder="Username" placeholderTextColor="#4A5068"
                value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false}
                textContentType="username" autoComplete="username-new"
                accessibilityLabel="Benutzername" accessibilityHint="Mindestens 3 Zeichen" />
              {username.length >= 3 && <Check color={colors.accent} size={18} accessibilityElementsHidden />}
            </View>
          )}

          <View style={s.inputWrap}>
            <Mail color="#4A5068" size={18} style={s.inputIcon} />
            <TextInput style={s.inputField} placeholder="E-Mail" placeholderTextColor="#4A5068"
              value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"
              autoCorrect={false} textContentType="emailAddress" autoComplete="email"
              accessibilityLabel="E-Mail-Adresse" />
            {email.length > 3 && emailValid && <Check color={colors.accent} size={18} accessibilityElementsHidden />}
          </View>

          {(mode === "login" || mode === "register") && (
            <View>
              <View style={s.inputWrap}>
                <Lock color="#4A5068" size={18} style={s.inputIcon} />
                <TextInput style={s.inputField} placeholder="Passwort" placeholderTextColor="#4A5068"
                  value={password} onChangeText={setPassword} secureTextEntry={!showPw}
                  textContentType={mode === "register" ? "newPassword" : "password"}
                  autoComplete={mode === "register" ? "password-new" : "password"}
                  accessibilityLabel="Passwort" accessibilityHint={mode === "register" ? "Mindestens 8 Zeichen, 1 Grossbuchstabe, 1 Zahl" : undefined} />
                <Pressable onPress={() => setShowPw(!showPw)} hitSlop={10} accessibilityRole="button" accessibilityLabel={showPw ? "Passwort verbergen" : "Passwort anzeigen"}>
                  {showPw ? <EyeOff color="#64748B" size={18} /> : <Eye color="#64748B" size={18} />}
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
            <Pressable
              style={s.termsRow}
              onPress={() => setAcceptTerms((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acceptTerms }}
              accessibilityLabel="Nutzungsbedingungen und Datenschutzerklaerung akzeptieren"
            >
              <View style={[s.checkbox, acceptTerms && s.checkboxOn]}>
                {acceptTerms && <Check color="#fff" size={14} strokeWidth={3} />}
              </View>
              <Text style={s.termsText}>
                Ich akzeptiere die{" "}
                <Text style={s.link} onPress={() => router.push("/legal/terms")}>Nutzungsbedingungen</Text>
                {" "}und die{" "}
                <Text style={s.link} onPress={() => router.push("/legal/privacy")}>Datenschutzerklärung</Text>.
              </Text>
            </Pressable>
          )}

          <Pressable
            style={[s.btn, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={submitLabel}
            accessibilityState={{ disabled: loading }}
          >
            {loading ? <ActivityIndicator color="#1A1D2E" /> : <Text style={s.btnText}>{submitLabel}</Text>}
          </Pressable>

          {mode === "login" && (
            <Pressable onPress={() => setMode("forgot")} style={s.secondaryBtn} accessibilityRole="button" accessibilityLabel="Passwort vergessen">
              <Text style={[s.secondaryText, { color: colors.accent }]}>Passwort vergessen?</Text>
            </Pressable>
          )}

          {(mode === "login" || mode === "register") && (
            <Pressable onPress={() => setMode(mode === "register" ? "login" : "register")} style={s.toggle} accessibilityRole="button" accessibilityLabel={mode === "register" ? "Zur Anmeldung wechseln" : "Zur Registrierung wechseln"}>
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
      <Check color={ok ? colors.accent : "#4A5068"} size={14} strokeWidth={ok ? 2.5 : 1.5} />
      <Text style={[s.pwRuleText, ok && { color: colors.accent }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0E1A" },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 32 },

  // Reset success banner
  resetBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#10B98112", borderWidth: 1, borderColor: "#10B98125",
    borderRadius: 12, padding: 14, marginBottom: 24,
  },
  resetBannerText: { color: "#10B981", fontSize: 13, fontWeight: "600", flex: 1 },

  // Logo
  logoWrap: { alignSelf: "center", marginBottom: 12 },
  logoMark: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#F59E0B", justifyContent: "center", alignItems: "center" },
  logoV: { color: "#1A1D2E", fontSize: 24, fontWeight: "800" },
  logo: { color: "#FFFFFF", fontSize: 28, fontWeight: "800", textAlign: "center", letterSpacing: -0.5 },
  tagline: { color: "#64748B", fontSize: 12, textAlign: "center", marginTop: 2, letterSpacing: 2, textTransform: "uppercase" },

  // Back
  backRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 20 },
  backText: { color: "#94A3B8", fontSize: 13 },

  subtitle: { color: "#FFFFFF", fontSize: 28, fontWeight: "800", textAlign: "center", marginTop: 32, marginBottom: 8 },
  forgotBody: { color: "#94A3B8", fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 24 },

  // Success state
  successIcon: { alignSelf: "center", width: 64, height: 64, borderRadius: 32, backgroundColor: "#10B98118", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  title: { color: "#FFFFFF", fontSize: 24, fontWeight: "800", textAlign: "center", marginBottom: 12 },
  body: { color: "#94A3B8", fontSize: 15, lineHeight: 22, textAlign: "center", marginBottom: 28 },

  // Form
  form: { gap: 14, marginTop: 8 },
  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#141926", borderRadius: 14, paddingHorizontal: 14,
    borderWidth: 1, borderColor: "#1E2235", height: 52,
  },
  inputIcon: { opacity: 0.7 },
  inputField: { flex: 1, color: "#FFFFFF", fontSize: 16 },
  pwChecks: { marginTop: 8, gap: 4, paddingLeft: 4 },
  pwRule: { flexDirection: "row", alignItems: "center", gap: 6 },
  pwRuleText: { color: "#4A5068", fontSize: 12 },
  btn: { backgroundColor: "#F59E0B", borderRadius: 14, height: 54, alignItems: "center", justifyContent: "center", marginTop: 4 },
  btnText: { color: "#1A1D2E", fontSize: 16, fontWeight: "800" },
  secondaryBtn: { padding: 12, alignItems: "center" },
  secondaryText: { color: "#64748B", fontSize: 13 },
  toggle: { padding: 12 },
  toggleText: { color: "#F59E0B", textAlign: "center", fontSize: 14, fontWeight: "600" },
  termsRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 6, gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#1E2235", marginTop: 2, justifyContent: "center", alignItems: "center" },
  checkboxOn: { backgroundColor: "#F59E0B", borderColor: "#F59E0B" },
  termsText: { flex: 1, color: "#94A3B8", fontSize: 13, lineHeight: 19 },
  link: { color: "#F59E0B", textDecorationLine: "underline" },
});
