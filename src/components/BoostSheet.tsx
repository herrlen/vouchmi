// src/components/BoostSheet.tsx
//
// Bottom-sheet for boosting (= "promoting") a user's own recommendation.
// Tiers are kept in-app to render labels deterministically; the source of
// truth for credits/multiplier/duration is config/credits.php on the backend.

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Check, Coins, Rocket, Users, X } from "lucide-react-native";
import { colors } from "../constants/theme";
import {
  boost as boostApi,
  communities as communitiesApi,
  wallet as walletApi,
  type Boost,
  type BoostTier,
  type Community,
} from "../lib/api";

type Props = {
  visible: boolean;
  postId: string;
  onClose: () => void;
  onSuccess?: (boost: Boost) => void;
};

type TierDef = {
  id: BoostTier;
  title: string;
  credits: number;
  multiplier: number;
  durationLabel: string;
  description: string;
};

const TIERS: TierDef[] = [
  {
    id: "mini",
    title: "Mini-Boost",
    credits: 50,
    multiplier: 2,
    durationLabel: "6 Std.",
    description: "Doppelte Reichweite — gut für Last-Minute-Push.",
  },
  {
    id: "standard",
    title: "Standard",
    credits: 150,
    multiplier: 3,
    durationLabel: "24 Std.",
    description: "Dreifache Reichweite über einen ganzen Tag.",
  },
  {
    id: "pro",
    title: "Pro",
    credits: 400,
    multiplier: 5,
    durationLabel: "72 Std.",
    description: "Fünffach + Discover-Slot. Für wichtige Empfehlungen.",
  },
  {
    id: "brand_push",
    title: "Brand-Push",
    credits: 1000,
    multiplier: 8,
    durationLabel: "7 Tage",
    description: "Achtfach, Discover-Slot und Push an deine Follower.",
  },
];

export default function BoostSheet({ visible, postId, onClose, onSuccess }: Props) {
  const [balance, setBalance] = useState<number | null>(null);
  const [busyTier, setBusyTier] = useState<BoostTier | null>(null);
  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  // null = an alle natürlich erreichbaren User (Follower + alle gemeinsamen Communities + Discover bei Pro/Brand-Push).
  // [] = an niemanden (sinnlos, daher disabled).
  // [ids] = nur an Mitglieder dieser Communities (+ Follower bleiben sowieso erreicht).
  const [selectedCommunityIds, setSelectedCommunityIds] = useState<string[] | null>(null);

  useEffect(() => {
    if (!visible) return;
    walletApi
      .show()
      .then((s) => setBalance(s.wallet.balance_credits))
      .catch(() => setBalance(null));
    communitiesApi
      .mine()
      .then((r) => setMyCommunities(r.communities ?? []))
      .catch(() => setMyCommunities([]));
    setSelectedCommunityIds(null); // reset jedes Mal beim Öffnen
  }, [visible]);

  function toggleCommunity(id: string) {
    setSelectedCommunityIds((curr) => {
      if (curr === null) {
        // Vorher "alle", jetzt User schränkt ein → starte mit dieser Community
        return [id];
      }
      if (curr.includes(id)) {
        const next = curr.filter((c) => c !== id);
        return next.length === 0 ? null : next;
      }
      return [...curr, id];
    });
  }

  function resetToAll() {
    setSelectedCommunityIds(null);
  }

  async function handleBoost(tier: TierDef) {
    if (balance !== null && balance < tier.credits) {
      Alert.alert(
        "Nicht genug Credits",
        `Für ${tier.title} brauchst du ${tier.credits} Credits. Möchtest du jetzt aufladen?`,
        [
          { text: "Abbrechen", style: "cancel" },
          {
            text: "Wallet öffnen",
            onPress: () => {
              onClose();
              router.push("/wallet" as any);
            },
          },
        ],
      );
      return;
    }

    setBusyTier(tier.id);
    try {
      const idempotencyKey = `${postId}-${tier.id}-${Date.now()}`;
      const result = await boostApi.create(
        postId,
        tier.id,
        idempotencyKey,
        selectedCommunityIds ?? undefined,
      );
      onSuccess?.(result.boost);
      onClose();
      Alert.alert("Boost aktiv", `${tier.title} läuft jetzt für ${tier.durationLabel}.`);
    } catch (e: any) {
      const msg = e?.message ?? "Boost fehlgeschlagen.";
      if (msg.includes("insufficient_credits")) {
        Alert.alert("Nicht genug Credits", "Bitte lade dein Wallet auf.");
      } else if (msg.includes("boost_conflict")) {
        Alert.alert("Bereits aktiv", "Dieser Post wird gerade schon beworben.");
      } else {
        Alert.alert("Fehler", msg);
      }
    } finally {
      setBusyTier(null);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.handle} />
        <View style={s.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Rocket size={20} color={colors.accent} />
            <Text style={s.title}>Empfehlung bewerben</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <X size={20} color={colors.gray} />
          </Pressable>
        </View>

        <View style={s.balanceRow}>
          <Coins size={14} color={colors.accent} />
          <Text style={s.balanceText}>
            {balance === null
              ? "Guthaben wird geladen…"
              : `${balance.toLocaleString("de-DE")} Credits verfügbar`}
          </Text>
        </View>

        {myCommunities.length > 0 ? (
          <View style={s.targetSection}>
            <View style={s.targetHeader}>
              <Users size={14} color={colors.gray} />
              <Text style={s.targetTitle}>Reichweite</Text>
              {selectedCommunityIds !== null ? (
                <Pressable onPress={resetToAll} hitSlop={8}>
                  <Text style={s.targetReset}>Alle</Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={s.targetHint}>
              {selectedCommunityIds === null
                ? "Standard: Follower + alle deine Communities. Du kannst Communities auswählen, um den Boost gezielter auszuspielen."
                : `Nur Mitglieder von ${selectedCommunityIds.length} ${selectedCommunityIds.length === 1 ? "Community" : "Communities"} (+ Follower)`}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
              {myCommunities.map((c) => {
                const isSelected = selectedCommunityIds?.includes(c.id) ?? false;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => toggleCommunity(c.id)}
                    style={[s.chip, isSelected && s.chipSelected]}
                  >
                    {isSelected ? <Check size={12} color={colors.bg} /> : null}
                    <Text style={[s.chipText, isSelected && s.chipTextSelected]} numberOfLines={1}>
                      {c.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ paddingBottom: 24 }}>
          {TIERS.map((t) => {
            const insufficient = balance !== null && balance < t.credits;
            const busy = busyTier === t.id;
            return (
              <Pressable
                key={t.id}
                style={({ pressed }) => [
                  s.tier,
                  insufficient && s.tierDisabled,
                  pressed && !insufficient && !busy && { opacity: 0.85 },
                ]}
                onPress={() => handleBoost(t)}
                disabled={busy || busyTier !== null}
              >
                <View style={{ flex: 1 }}>
                  <View style={s.tierTitleRow}>
                    <Text style={s.tierTitle}>{t.title}</Text>
                    <View style={s.multiplierBadge}>
                      <Text style={s.multiplierText}>×{t.multiplier}</Text>
                    </View>
                  </View>
                  <Text style={s.tierDescription}>{t.description}</Text>
                  <Text style={s.tierDuration}>Dauer: {t.durationLabel}</Text>
                </View>
                <View style={s.tierCta}>
                  {busy ? (
                    <ActivityIndicator color={colors.accent} />
                  ) : (
                    <>
                      <Text style={s.tierCredits}>{t.credits}</Text>
                      <Text style={s.tierCreditsLabel}>Credits</Text>
                    </>
                  )}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={s.footnote}>
          Boosted Posts werden mit „Beworben" gekennzeichnet (DSA / §6 TMG). Stornierung
          möglich in den ersten 5 Minuten und solange noch keine Impressions gezählt wurden.
        </Text>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { color: colors.white, fontSize: 18, fontWeight: "600" },

  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.bgCard,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  balanceText: { color: colors.white, fontSize: 13 },

  tier: {
    flexDirection: "row",
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    alignItems: "center",
  },
  tierDisabled: { opacity: 0.45 },
  tierTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tierTitle: { color: colors.white, fontSize: 15, fontWeight: "600" },
  multiplierBadge: {
    backgroundColor: colors.accentDim,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  multiplierText: { color: colors.accent, fontSize: 12, fontWeight: "700" },
  tierDescription: { color: colors.gray, fontSize: 12, marginTop: 4, lineHeight: 16 },
  tierDuration: { color: colors.grayDark, fontSize: 11, marginTop: 4 },
  tierCta: {
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
    minWidth: 64,
  },
  tierCredits: { color: colors.accent, fontSize: 20, fontWeight: "700" },
  tierCreditsLabel: { color: colors.gray, fontSize: 10 },

  footnote: { color: colors.grayDark, fontSize: 11, marginTop: 8, lineHeight: 16 },

  targetSection: { marginBottom: 12 },
  targetHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  targetTitle: { color: colors.white, fontSize: 13, fontWeight: "600", flex: 1 },
  targetReset: { color: colors.accent, fontSize: 12, fontWeight: "600" },
  targetHint: { color: colors.gray, fontSize: 11, lineHeight: 15, marginBottom: 8 },
  chipRow: { gap: 6, paddingVertical: 2 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.bgCard,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    maxWidth: 140,
  },
  chipSelected: { backgroundColor: colors.accent },
  chipText: { color: colors.white, fontSize: 12 },
  chipTextSelected: { color: colors.bg, fontWeight: "700" },
});
