import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { CheckCircle2, Clock, XCircle } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { subscription as subApi } from "../src/lib/api";
import { useAuth } from "../src/lib/store";

type State = "polling" | "success" | "pending" | "cancelled";

export default function InfluencerReturn() {
  const params = useLocalSearchParams<{ cancel?: string }>();
  const wasCancelled = params.cancel === "1";
  const [state, setState] = useState<State>(wasCancelled ? "cancelled" : "polling");
  const initAuth = useAuth((s) => s.init);

  useEffect(() => {
    if (wasCancelled) return;

    let attempts = 0;
    let cancelled = false;

    const poll = async (): Promise<void> => {
      if (cancelled) return;
      try {
        const status = await subApi.status();
        if (status.has_active && status.plan_type === "influencer") {
          await initAuth();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setState("success");
          setTimeout(() => router.replace("/(tabs)/profile"), 1500);
          return;
        }
      } catch {
        // ignorieren
      }
      if (++attempts >= 10) {
        setState("pending");
        return;
      }
      setTimeout(poll, 3000);
    };

    poll();
    return () => { cancelled = true; };
  }, []);

  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.centered}>
        {state === "polling" && (
          <>
            <ActivityIndicator color="#25D366" size="large" />
            <Text style={s.title}>Zahlung wird verarbeitet…</Text>
            <Text style={s.body}>Wir aktivieren dein Influencer-Abo. Das kann ein paar Sekunden dauern.</Text>
          </>
        )}
        {state === "success" && (
          <>
            <CheckCircle2 color="#25D366" size={64} strokeWidth={1.8} />
            <Text style={s.title}>Du bist jetzt Influencer!</Text>
            <Text style={s.body}>Analytics, Tier-Progression und Creator-Features sind freigeschaltet.</Text>
          </>
        )}
        {state === "pending" && (
          <>
            <Clock color="#F59E0B" size={64} strokeWidth={1.8} />
            <Text style={s.title}>Wird noch bearbeitet</Text>
            <Text style={s.body}>Dein Abo wird automatisch aktiviert, sobald PayPal die Zahlung bestätigt. Du kannst die App in der Zwischenzeit normal nutzen.</Text>
            <Pressable style={s.btn} onPress={() => router.replace("/(tabs)/profile")}>
              <Text style={s.btnText}>Zum Profil</Text>
            </Pressable>
          </>
        )}
        {state === "cancelled" && (
          <>
            <XCircle color="#F472B6" size={64} strokeWidth={1.8} />
            <Text style={s.title}>Abo nicht abgeschlossen</Text>
            <Text style={s.body}>Du hast den Bezahlvorgang abgebrochen. Du kannst ihn jederzeit in der App erneut starten.</Text>
            <Pressable style={s.btn} onPress={() => router.replace("/influencer-register")}>
              <Text style={s.btnText}>Erneut versuchen</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0E1A" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32, gap: 12 },
  title: { color: "#FFFFFF", fontSize: 22, fontWeight: "800", textAlign: "center", marginTop: 16 },
  body: { color: "#94A3B8", fontSize: 15, lineHeight: 22, textAlign: "center" },
  btn: { marginTop: 24, backgroundColor: "#F59E0B", borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
  btnText: { color: "#1A1D2E", fontSize: 16, fontWeight: "800" },
});
