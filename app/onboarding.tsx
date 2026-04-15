import { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  Dimensions,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Users, Sparkles, Store, ChevronLeft, ArrowRight, Check, User as UserIcon, Megaphone, Building2 } from "lucide-react-native";
import { colors } from "../src/constants/theme";
import { useAuth } from "../src/lib/store";
import { brand as brandApi } from "../src/lib/api";
import { useProfileMode } from "../src/lib/profile-mode";

const { width } = Dimensions.get("window");

type Role = "user" | "influencer" | "brand";
type Screen = "slides" | "role" | "form";

type Slide = {
  icon: (c: string) => React.ReactNode;
  accent: string;
  headline: string;
  body: string;
};

const slides: Slide[] = [
  {
    icon: (c) => <Users color={c} size={44} strokeWidth={1.8} />,
    accent: "#F472B6",
    headline: "Deine Community.\nDein Vorteil.",
    body: "Tritt Communities bei, die zu dir passen. Entdecke Geheimtipps, bevor sie viral gehen — empfohlen von Menschen, denen du vertraust.",
  },
  {
    icon: (c) => <Sparkles color={c} size={44} strokeWidth={1.8} />,
    accent: "#10B981",
    headline: "Empfehle & werde\nentdeckt.",
    body: "Jede Empfehlung in deiner Community macht dich sichtbar. Dein Profil-Link wird automatisch geteilt — und mit etwas Glück wirst du von Marken entdeckt.",
  },
  {
    icon: (c) => <Store color={c} size={44} strokeWidth={1.8} />,
    accent: "#4F46E5",
    headline: "Deine Brand.\nDeine Community.",
    body: "Du hast ein eigenes Unternehmen und möchtest deine Produkte empfehlen? Die Community wartet auf dich.",
  },
];

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

export default function OnboardingScreen() {
  const [screen, setScreen] = useState<Screen>("slides");
  const [slideIndex, setSlideIndex] = useState(0);
  const [role, setRole] = useState<Role>("user");
  const listRef = useRef<FlatList>(null);

  const toRole = () => setScreen("role");
  const chooseRole = (r: Role) => { setRole(r); setScreen("form"); };
  const back = () => {
    if (screen === "form") setScreen("role");
    else if (screen === "role") setScreen("slides");
  };

  const skip = () => setScreen("role");

  const nextSlide = () => {
    if (slideIndex < slides.length - 1) {
      listRef.current?.scrollToIndex({ index: slideIndex + 1 });
    } else {
      toRole();
    }
  };

  if (screen === "role") return <RoleScreen onBack={back} onPick={chooseRole} />;
  if (screen === "form") return <FormScreen role={role} onBack={back} />;

  const slide = slides[slideIndex];
  const isLast = slideIndex === slides.length - 1;

  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      <View style={s.topRow}>
        <View style={{ width: 80 }} />
        <Pressable onPress={skip} hitSlop={10} style={s.skipBtn}>
          <Text style={s.skipText}>Überspringen</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setSlideIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={[s.slide, { width }]}>
            <View style={[s.iconBubble, { backgroundColor: item.accent + "22" }]}>
              {item.icon(item.accent)}
            </View>
            <Text style={s.headline}>{item.headline}</Text>
            <Text style={s.body}>{item.body}</Text>
          </View>
        )}
      />

      <View style={s.bottom}>
        <View style={s.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                s.dot,
                i === slideIndex && { width: 28, backgroundColor: slide.accent },
              ]}
            />
          ))}
        </View>
        <Pressable style={[s.cta, { backgroundColor: isLast ? "#10B981" : slide.accent }]} onPress={nextSlide}>
          <Text style={s.ctaText}>{isLast ? "Los geht's" : "Weiter"}</Text>
          <ArrowRight color="#fff" size={18} strokeWidth={2.2} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function RoleScreen({ onBack, onPick }: { onBack: () => void; onPick: (r: Role) => void }) {
  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      <View style={s.header}>
        <Pressable onPress={onBack} style={s.iconBtn} hitSlop={10}>
          <ChevronLeft color={colors.white} size={26} strokeWidth={2} />
        </Pressable>
        <View style={s.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={s.roleScroll}>
        <Text style={s.roleTitle}>Wie möchtest du{"\n"}Vouchmi nutzen?</Text>
        <Text style={s.roleSub}>Wähle deine Rolle — du kannst sie später jederzeit ändern.</Text>

        <View style={{ marginTop: 28, gap: 12 }}>
          {roles.map((r) => (
            <Pressable
              key={r.id}
              style={[s.roleCard, { borderColor: r.color + "40" }]}
              onPress={() => onPick(r.id)}
            >
              <View style={[s.roleIcon, { backgroundColor: r.color + "22" }]}>
                {r.icon(r.color)}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.roleLabel}>{r.label}</Text>
                <Text style={s.roleDesc}>{r.desc}</Text>
              </View>
              <Text style={s.roleChev}>›</Text>
            </Pressable>
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
      // Display-Name auf den eingegebenen Firmen-/Vornamen setzen:
      // geht per /user/profile PUT, aber um den Scope schmal zu halten
      // übernimmt der Server bei leerem display_name den Username;
      // der Nutzer kann den Namen später in „Profil bearbeiten" ändern.

      await SecureStore.setItemAsync("onboarding_done", "1");

      if (role === "brand") {
        // Brand-Profil anlegen und PayPal-Checkout starten.
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

      router.replace("/");
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
              <Text style={s.priceAmount}>0,99 €<Text style={s.pricePer}> / Monat</Text></Text>
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
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 4 },
  skipBtn: { padding: 8 },
  skipText: { color: colors.gray, fontSize: 13, fontWeight: "500" },
  slide: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 36 },
  iconBubble: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", marginBottom: 28 },
  headline: { color: colors.white, fontSize: 28, fontWeight: "800", textAlign: "center", lineHeight: 34, letterSpacing: -0.4, marginBottom: 14 },
  body: { color: colors.gray, fontSize: 15, lineHeight: 23, textAlign: "center", maxWidth: 300 },

  bottom: { paddingHorizontal: 36, paddingBottom: 16, gap: 18, alignItems: "center" },
  dots: { flexDirection: "row", gap: 8, alignItems: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", height: 52, borderRadius: 16 },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },

  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, paddingTop: 4 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },

  roleScroll: { padding: 24, paddingBottom: 40, flexGrow: 1, justifyContent: "center" },
  roleTitle: { color: colors.white, fontSize: 28, fontWeight: "800", textAlign: "center", lineHeight: 34, letterSpacing: -0.4 },
  roleSub: { color: colors.gray, fontSize: 14, lineHeight: 22, textAlign: "center", marginTop: 10 },
  roleCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.bgCard, borderWidth: 1, borderRadius: 16, padding: 16 },
  roleIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  roleLabel: { color: colors.white, fontSize: 16, fontWeight: "700" },
  roleDesc: { color: colors.gray, fontSize: 12, marginTop: 2 },
  roleChev: { color: colors.grayDark, fontSize: 22 },

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
});
