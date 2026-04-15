import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { CheckCircle2, XCircle, MailCheck } from "lucide-react-native";
import { auth as authApi } from "../src/lib/api";
import { useAuth } from "../src/lib/store";
import { colors } from "../src/constants/theme";

type Status = "pending" | "success" | "error";

export default function VerifyEmail() {
  const params = useLocalSearchParams<{ token?: string; email?: string }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const email = Array.isArray(params.email) ? params.email[0] : params.email;
  const refreshUser = useAuth((s) => s.init);
  const [status, setStatus] = useState<Status>("pending");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token || !email) {
      setStatus("error");
      setMessage("Der Bestätigungs-Link ist unvollständig.");
      return;
    }
    authApi
      .verifyEmail({ email, token })
      .then(async (res) => {
        setMessage(res.message);
        setStatus("success");
        // Eingeloggten User-Datensatz nachladen (falls Bearer-Token aktiv)
        await refreshUser().catch(() => {});
      })
      .catch((e: any) => {
        setStatus("error");
        setMessage(e.message ?? "Konnte E-Mail nicht bestätigen.");
      });
  }, [token, email, refreshUser]);

  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.content}>
        <View style={s.iconBubble}>
          {status === "pending" && <ActivityIndicator color={colors.accent} size="large" />}
          {status === "success" && <CheckCircle2 color="#10B981" size={58} strokeWidth={1.8} />}
          {status === "error" && <XCircle color="#EF4444" size={58} strokeWidth={1.8} />}
        </View>

        <Text style={s.title}>
          {status === "pending" && "E-Mail wird bestätigt…"}
          {status === "success" && "E-Mail bestätigt"}
          {status === "error" && "Bestätigung fehlgeschlagen"}
        </Text>

        {status !== "pending" && (
          <Text style={s.body}>
            {status === "success"
              ? "Danke! Dein Konto ist jetzt vollständig aktiviert. Du kannst Vouchmi ohne Einschränkungen nutzen."
              : message}
          </Text>
        )}

        {status === "success" && (
          <Pressable style={s.cta} onPress={() => router.replace("/reco")}>
            <Text style={s.ctaText}>Zu Vouchmi</Text>
          </Pressable>
        )}

        {status === "error" && (
          <>
            <Pressable
              style={s.cta}
              onPress={() => authApi.sendVerification().then(() => router.replace("/reco")).catch(() => router.replace("/auth"))}
            >
              <MailCheck color="#fff" size={18} />
              <Text style={s.ctaText}>Neuen Link anfordern</Text>
            </Pressable>
            <Pressable onPress={() => router.replace("/auth")} style={s.secondaryBtn}>
              <Text style={s.secondaryText}>Zur Anmeldung</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 8 },
  iconBubble: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.bgCard, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  title: { color: colors.white, fontSize: 24, fontWeight: "800", textAlign: "center", marginBottom: 6 },
  body: { color: colors.gray, fontSize: 14, lineHeight: 22, textAlign: "center", marginBottom: 18, maxWidth: 300 },
  cta: { flexDirection: "row", gap: 10, backgroundColor: colors.accent, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondaryBtn: { padding: 14, alignItems: "center" },
  secondaryText: { color: colors.gray, fontSize: 13 },
});
