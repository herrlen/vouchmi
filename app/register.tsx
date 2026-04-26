import { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import {
  ChevronLeft,
  ArrowRight,
  Check,
  User as UserIcon,
  Megaphone,
  Building2,
} from "lucide-react-native";
import { colors } from "../src/constants/theme";
import { useAuth } from "../src/lib/store";
import { brand as brandApi } from "../src/lib/api";
import { useProfileMode } from "../src/lib/profile-mode";

type Role = "user" | "influencer" | "brand";
type Screen = "role" | "form";

const roles: { id: Role; label: string; desc: string; color: string; icon: (c: string) => React.ReactNode }[] = [
  {
    id: "user",
    label: "User",
    desc: "Entdecke & speichere Empfehlungen",
    color: "#F59E0B",
    icon: (c) => <UserIcon color={c} size={22} strokeWidth={1.9} />,
  },
  {
    id: "influencer",
    label: "Influencer",
    desc: "Empfehle Produkte & werde entdeckt",
    color: "#F472B6",
    icon: (c) => <Megaphone color={c} size={22} strokeWidth={1.9} />,
  },
  {
    id: "brand",
    label: "Brand",
    desc: "Präsentiere deine Marke der Community",
    color: "#4F46E5",
    icon: (c) => <Building2 color={c} size={22} strokeWidth={1.9} />,
  },
];

function validateEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function validatePassword(pw: string) {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    number: /[0-9]/.test(pw),
    valid: pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw),
  };
}

export default function RegisterScreen() {
  const [screen, setScreen] = useState<Screen>("role");
  const [role, setRole] = useState<Role>("user");
  const [showInfluencerSheet, setShowInfluencerSheet] = useState(false);

  const chooseRole = (r: Role) => { setRole(r); setScreen("form"); };

  const handleRolePick = (r: Role) => {
    if (r === "influencer") {
      setShowInfluencerSheet(true);
    } else {
      chooseRole(r);
    }
  };

  const backFromRole = () => router.back();
  const backFromForm = () => setScreen("role");

  if (screen === "form") return <FormScreen role={role} onBack={backFromForm} />;

  return (
    <>
      <RoleScreen onBack={backFromRole} onPick={handleRolePick} />
      {showInfluencerSheet && (
        <InfluencerPathSheet
          onCreator={() => { setShowInfluencerSheet(false); chooseRole("influencer"); }}
          onUser={() => { setShowInfluencerSheet(false); chooseRole("user"); }}
          onClose={() => setShowInfluencerSheet(false)}
        />
      )}
    </>
  );
}

function RoleScreen({ onBack, onPick }: { onBack: () => void; onPick: (r: Role) => void }) {
  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      <View style={s.header}>
        <Pressable onPress={onBack} style={s.iconBtn} hitSlop={10} accessibilityRole="button" accessibilityLabel="Zurueck zur Anmeldung">
          <ChevronLeft color={colors.white} size={26} strokeWidth={2} />
        </Pressable>
        <View style={s.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={s.roleScroll}>
        <Text style={s.roleTitle} accessibilityRole="header">Wie möchtest du{"\n"}Vouchmi nutzen?</Text>
        <Text style={s.roleSub}>Wähle deine Rolle — du kannst sie später jederzeit ändern.</Text>

        <View style={{ marginTop: 28, gap: 12 }}>
          {roles.map((r) => (
            <View key={r.id}>
              <Pressable
                style={[s.roleCard, { borderColor: r.color + "40" }]}
                onPress={() => onPick(r.id)}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`${r.label}: ${r.desc}`}
                accessibilityHint="Waehlt diese Rolle aus"
              >
                <View style={[s.roleIcon, { backgroundColor: r.color + "22" }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  {r.icon(r.color)}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.roleLabel}>{r.label}</Text>
                  <Text style={s.roleDesc}>{r.desc}</Text>
                </View>
                <Text style={s.roleChev} accessibilityElementsHidden>›</Text>
              </Pressable>
              <Pressable style={s.roleHelpLink} onPress={() => router.push(`/help?filter=${r.id}`)} hitSlop={6}>
                <Text style={[s.roleHelpText, { color: r.color }]}>Was kann ich als {r.label}?</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FormScreen({ role, onBack }: { role: Role; onBack: () => void }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paypal, setPaypal] = useState("");
  const [samePaypal, setSamePaypal] = useState(true);
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const register = useAuth((s) => s.register);
  const refreshProfileMode = useProfileMode((s) => s.refresh);

  const roleData = roles.find((r) => r.id === role)!;
  const pw = useMemo(() => validatePassword(password), [password]);
  const emailValid = useMemo(() => validateEmail(email), [email]);

  const submit = async () => {
    if (!name.trim()) return Alert.alert("Fehler", role === "brand" ? "Bitte Firmenname angeben." : "Bitte Name angeben.");
    if (!username.trim() || username.length < 3) return Alert.alert("Fehler", "Username (mind. 3 Zeichen) angeben.");
    if (!emailValid) return Alert.alert("Fehler", "Bitte eine gültige E-Mail angeben.");
    if (role === "influencer" && !phone.trim()) return Alert.alert("Fehler", "Bitte Telefonnummer angeben.");
    if (!pw.valid) return Alert.alert("Fehler", "Passwort erfüllt die Anforderungen nicht.");
    if (!acceptTerms) return Alert.alert("Fehler", "Bitte Nutzungsbedingungen akzeptieren.");

    setLoading(true);
    try {
      await register(email.trim(), password, username.trim(), acceptTerms, {
        role,
        phone: role === "influencer" ? phone.trim() : undefined,
      });

      await SecureStore.setItemAsync("onboarding_done", "1");

      if (role === "brand") {
        try {
          await brandApi.register({
            brand_name: name.trim(),
            company_email: email.trim(),
            paypal_email: samePaypal ? email.trim() : paypal.trim(),
          });
          const res = await brandApi.subscribe();
          await refreshProfileMode();
          if (res.approval_url) {
            await Linking.openURL(res.approval_url);
          } else {
            Alert.alert(
              "Hinweis",
              "Dein Account ist angelegt. Schließe dein Brand-Abo in den Einstellungen → Brand-Profil ab."
            );
          }
        } catch (e: any) {
          Alert.alert("Brand-Profil", e.message ?? "Brand-Profil konnte nicht angelegt werden. Du kannst das später in den Einstellungen nachholen.");
        }
      }

      // Nur Influencer müssen ihre Telefonnummer verifizieren.
      // Brand registriert per Unternehmens-E-Mail (kein Phone-Verify-Pflicht),
      // User per E-Mail (auch keine Pflicht).
      if (role === "influencer") {
        router.replace("/phone-verify?required=1");
      } else {
        router.replace("/");
      }
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      <View style={s.header}>
        <Pressable onPress={onBack} style={s.iconBtn} hitSlop={10}>
          <ChevronLeft color={colors.white} size={26} strokeWidth={2} />
        </Pressable>
        <View style={s.iconBtn} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.formScroll} keyboardShouldPersistTaps="handled">
          <View style={[s.roleBadge, { backgroundColor: roleData.color + "22", borderColor: roleData.color + "60" }]}>
            {roleData.icon(roleData.color)}
            <Text style={[s.roleBadgeText, { color: roleData.color }]}>{roleData.label}</Text>
          </View>

          {role === "brand" && (
            <View style={s.priceBox}>
              <Text style={s.priceAmount}>1,99 €<Text style={s.pricePer}> / Monat</Text></Text>
              <Text style={s.priceDesc}>Brand-Abo — wird monatlich per PayPal abgebucht. Jederzeit kündbar.</Text>
            </View>
          )}

          <Text style={s.formTitle}>Konto erstellen</Text>

          <Field label={role === "brand" ? "Firmenname" : "Name"}
            value={name} onChangeText={setName}
            placeholder={role === "brand" ? "Dein Firmenname" : "Dein Name"} />

          <Field label="Username" value={username} onChangeText={setUsername}
            placeholder="nur Buchstaben, Zahlen, _-"
            autoCapitalize="none" autoCorrect={false} />

          <Field
            label={role === "brand" ? "Unternehmens-E-Mail" : "E-Mail"}
            value={email}
            onChangeText={(v) => { setEmail(v); if (samePaypal) setPaypal(v); }}
            placeholder={role === "brand" ? "name@firma.de" : "name@email.de"}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {role === "influencer" && (
            <Field label="Telefonnummer" value={phone} onChangeText={setPhone}
              placeholder="+49 170 1234567" keyboardType="phone-pad" />
          )}

          {role === "brand" && (
            <>
              <Pressable style={s.checkRow} onPress={() => {
                const next = !samePaypal;
                setSamePaypal(next);
                if (next) setPaypal(email);
              }}>
                <View style={[s.checkbox, samePaypal && { backgroundColor: roleData.color, borderColor: roleData.color }]}>
                  {samePaypal && <Check color="#fff" size={14} strokeWidth={3} />}
                </View>
                <Text style={s.checkText}>PayPal-E-Mail gleich wie Unternehmens-E-Mail</Text>
              </Pressable>
              {!samePaypal && (
                <Field label="PayPal-E-Mail" value={paypal} onChangeText={setPaypal}
                  placeholder="paypal@firma.de" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
              )}
            </>
          )}

          <Field label="Passwort" value={password} onChangeText={setPassword}
            placeholder="Mindestens 8 Zeichen" secureTextEntry />

          {password.length > 0 && (
            <View style={s.pwRules}>
              <Rule ok={pw.length} label="Min. 8 Zeichen" />
              <Rule ok={pw.upper} label="1 Großbuchstabe" />
              <Rule ok={pw.number} label="1 Zahl" />
            </View>
          )}

          <Pressable style={s.termsRow} onPress={() => setAcceptTerms((v) => !v)}>
            <View style={[s.checkbox, acceptTerms && { backgroundColor: roleData.color, borderColor: roleData.color }]}>
              {acceptTerms && <Check color="#fff" size={14} strokeWidth={3} />}
            </View>
            <Text style={s.termsText}>
              Ich akzeptiere die{" "}
              <Text style={s.link} onPress={() => router.push("/legal/terms")}>Nutzungsbedingungen</Text>
              {" "}und die{" "}
              <Text style={s.link} onPress={() => router.push("/legal/privacy")}>Datenschutzerklärung</Text>.
            </Text>
          </Pressable>

          <Pressable
            style={[s.cta, { backgroundColor: roleData.color, marginTop: 6 }, loading && { opacity: 0.6 }]}
            onPress={submit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={s.ctaText}>{role === "brand" ? "Registrieren & zu PayPal" : "Registrieren"}</Text>
                <ArrowRight color="#fff" size={18} strokeWidth={2.2} />
              </>
            )}
          </Pressable>

          <Pressable style={s.loginLink} onPress={() => router.replace("/auth")}>
            <Text style={s.loginLinkText}>Bereits ein Konto? <Text style={{ color: roleData.color, fontWeight: "700" }}>Anmelden</Text></Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InfluencerPathSheet({ onCreator, onUser, onClose }: { onCreator: () => void; onUser: () => void; onClose: () => void }) {
  return (
    <Modal visible transparent animationType="slide" statusBarTranslucent>
      <View style={s.sheetBackdrop}>
        <View style={s.sheetContainer}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>Wie startest du?</Text>

          <Pressable style={[s.pathCard, { borderColor: "#F472B640" }]} onPress={onCreator}>
            <View style={[s.pathIcon, { backgroundColor: "#F472B620" }]}>
              <Text style={{ fontSize: 22 }}>⭐</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.pathLabel}>Ich bin bereits Creator</Text>
              <Text style={s.pathDesc}>Du hast schon eine Community? Starte direkt mit Telefon-Verifizierung und lege los.</Text>
              <Text style={s.pathHint}>Startet als Bronze — Tier wird nach 7 Tagen basierend auf deiner Aktivität neu berechnet.</Text>
            </View>
          </Pressable>

          <Pressable style={[s.pathCard, { borderColor: "#F59E0B40" }]} onPress={onUser}>
            <View style={[s.pathIcon, { backgroundColor: "#F59E0B20" }]}>
              <Text style={{ fontSize: 22 }}>🌱</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.pathLabel}>Als User starten, später aufsteigen</Text>
              <Text style={s.pathDesc}>Baue erst deine Community auf. Bei 1.000 Followern + 25 Empfehlungen wirst du automatisch zum Bronze-Creator.</Text>
              <Text style={s.pathHint}>Kein Telefon nötig — einfach mit E-Mail starten.</Text>
            </View>
          </Pressable>

          <Pressable style={s.sheetBack} onPress={onClose}>
            <Text style={s.sheetBackText}>Zurück</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={s.fieldGroup}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.grayDark}
        {...rest}
        style={[s.fieldInput, style]}
      />
    </View>
  );
}

function Rule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Check color={ok ? colors.accent : colors.grayDark} size={14} strokeWidth={ok ? 2.5 : 1.5} />
      <Text style={{ color: ok ? colors.accent : colors.grayDark, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, paddingTop: 4 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },

  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", height: 52, borderRadius: 16 },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },

  roleScroll: { padding: 24, paddingBottom: 40, flexGrow: 1, justifyContent: "center" },
  roleTitle: { color: colors.white, fontSize: 28, fontWeight: "800", textAlign: "center", lineHeight: 34, letterSpacing: -0.4 },
  roleSub: { color: colors.gray, fontSize: 14, lineHeight: 22, textAlign: "center", marginTop: 10 },
  roleCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.bgCard, borderWidth: 1, borderRadius: 16, padding: 16 },
  roleIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  roleLabel: { color: colors.white, fontSize: 16, fontWeight: "700" },
  roleDesc: { color: colors.gray, fontSize: 12, marginTop: 2 },
  roleChev: { color: colors.grayDark, fontSize: 22 },
  roleHelpLink: { alignSelf: "flex-end", paddingVertical: 4, paddingHorizontal: 4 },
  roleHelpText: { fontSize: 12, fontWeight: "600" },

  formScroll: { padding: 24, paddingBottom: 40 },
  roleBadge: { flexDirection: "row", alignSelf: "center", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginBottom: 18 },
  roleBadgeText: { fontSize: 13, fontWeight: "700" },
  priceBox: { backgroundColor: "rgba(79,70,229,0.08)", borderWidth: 1, borderColor: "rgba(79,70,229,0.25)", borderRadius: 14, padding: 14, marginBottom: 18, alignItems: "center" },
  priceAmount: { color: colors.white, fontSize: 22, fontWeight: "800" },
  pricePer: { color: colors.gray, fontSize: 14, fontWeight: "500" },
  priceDesc: { color: colors.gray, fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 4 },
  formTitle: { color: colors.white, fontSize: 24, fontWeight: "800", textAlign: "center", marginBottom: 20 },

  fieldGroup: { marginBottom: 14 },
  fieldLabel: { color: colors.gray, fontSize: 12, fontWeight: "600", marginBottom: 6, marginLeft: 2, textTransform: "uppercase", letterSpacing: 0.4 },
  fieldInput: { backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, height: 48, color: colors.white, fontSize: 15 },
  pwRules: { marginTop: -6, marginBottom: 10, paddingLeft: 4, gap: 4 },

  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  checkText: { color: colors.gray, fontSize: 13 },

  termsRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8, marginTop: 4 },
  termsText: { flex: 1, color: colors.gray, fontSize: 13, lineHeight: 19 },
  link: { color: colors.accent, textDecorationLine: "underline" },

  loginLink: { padding: 14, alignItems: "center" },
  loginLinkText: { color: colors.gray, fontSize: 13 },

  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheetContainer: { backgroundColor: colors.bgElevated, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.grayDark, alignSelf: "center", marginBottom: 20 },
  sheetTitle: { color: colors.white, fontSize: 24, fontWeight: "800", textAlign: "center", marginBottom: 20 },
  pathCard: { flexDirection: "row", gap: 14, backgroundColor: colors.bgCard, borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
  pathIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  pathLabel: { color: colors.white, fontSize: 15, fontWeight: "700", marginBottom: 4 },
  pathDesc: { color: colors.gray, fontSize: 13, lineHeight: 19, marginBottom: 6 },
  pathHint: { color: colors.grayDark, fontSize: 11, lineHeight: 16, fontStyle: "italic" },
  sheetBack: { alignItems: "center", paddingVertical: 14, minHeight: 44 },
  sheetBackText: { color: colors.gray, fontSize: 14, fontWeight: "500" },
});
