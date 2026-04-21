import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator, AccessibilityInfo } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { ChevronLeft, Check } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { colors } from "../src/constants/theme";
import { profile as profileApi, type ProfileLayout } from "../src/lib/api";

type LayoutOption = {
  value: ProfileLayout;
  label: string;
  description: string;
};

const LAYOUTS: LayoutOption[] = [
  {
    value: "masonry",
    label: "Masonry",
    description: "Bilder in zwei Spalten mit unterschiedlichen Höhen. Wirkt organisch, wie eine Pinnwand.",
  },
  {
    value: "featured",
    label: "Featured",
    description: "Ein großes Hauptbild oben, darunter kleinere Bilder im Grid. Lenkt den Blick auf dein Highlight.",
  },
];

type Props = {
  initialLayout?: ProfileLayout;
};

export default function LayoutSettingsScreen() {
  const [selected, setSelected] = useState<ProfileLayout>("masonry");
  const [original, setOriginal] = useState<ProfileLayout>("masonry");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load current layout on mount
  if (!loaded) {
    profileApi.get().then((r) => {
      const layout = r.profile.profile_layout ?? "masonry";
      setSelected(layout);
      setOriginal(layout);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }

  const hasChanged = selected !== original;

  const onSelect = (layout: ProfileLayout) => {
    setSelected(layout);
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!reduced) Haptics.selectionAsync();
    });
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await profileApi.updateLayout(selected);
      setOriginal(selected);
      Alert.alert("Gespeichert", "Layout gespeichert.");
      router.back();
    } catch (e: any) {
      Alert.alert("Fehler", e.message ?? "Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.iconBtn} hitSlop={10}>
          <ChevronLeft color={colors.white} size={26} strokeWidth={2} />
        </Pressable>
        <Text style={s.title}>Galerie-Layout</Text>
        <View style={s.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.subtitle}>
          So werden deine Empfehlungen auf deinem Profil dargestellt. Du kannst es jederzeit ändern.
        </Text>

        {LAYOUTS.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <Pressable
              key={opt.value}
              style={[s.card, isSelected && s.cardSelected]}
              onPress={() => onSelect(opt.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${opt.label} Layout`}
            >
              {/* Preview mockup */}
              <LayoutPreview type={opt.value} />

              <View style={s.cardBody}>
                <Text style={s.cardLabel}>{opt.label}</Text>
                <Text style={s.cardDesc}>{opt.description}</Text>
              </View>

              {isSelected && (
                <View style={s.checkBadge}>
                  <Check color="#fff" size={14} strokeWidth={3} />
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Sticky save button */}
      <SafeAreaView edges={["bottom"]} style={s.bottomBar}>
        <Pressable
          style={[s.saveBtn, !hasChanged && s.saveBtnDisabled]}
          onPress={onSave}
          disabled={!hasChanged || saving}
          accessibilityRole="button"
          accessibilityLabel="Speichern"
        >
          {saving ? (
            <ActivityIndicator color={colors.bg} size="small" />
          ) : (
            <Text style={[s.saveBtnText, !hasChanged && s.saveBtnTextDisabled]}>Speichern</Text>
          )}
        </Pressable>
      </SafeAreaView>
    </SafeAreaView>
  );
}

function LayoutPreview({ type }: { type: ProfileLayout }) {
  if (type === "masonry") {
    const heights = [60, 80, 50, 70, 90, 55];
    return (
      <View style={s.previewBox}>
        <View style={s.previewRow}>
          <View style={s.previewCol}>
            {[0, 2, 4].map((i) => (
              <View key={i} style={[s.previewBlock, { height: heights[i] }]} />
            ))}
          </View>
          <View style={s.previewCol}>
            {[1, 3, 5].map((i) => (
              <View key={i} style={[s.previewBlock, { height: heights[i] }]} />
            ))}
          </View>
        </View>
      </View>
    );
  }

  if (type === "featured") {
    return (
      <View style={s.previewBox}>
        <View style={[s.previewBlock, { height: 70, marginBottom: 6 }]} />
        <View style={s.previewRow}>
          <View style={s.previewCol}>
            <View style={[s.previewBlock, { height: 40 }]} />
            <View style={[s.previewBlock, { height: 40 }]} />
          </View>
          <View style={s.previewCol}>
            <View style={[s.previewBlock, { height: 40 }]} />
            <View style={[s.previewBlock, { height: 40 }]} />
          </View>
        </View>
      </View>
    );
  }

  return null;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { color: colors.white, fontSize: 18, fontWeight: "700" },
  content: { padding: 16, paddingBottom: 100 },
  subtitle: { color: colors.gray, fontSize: 13, lineHeight: 19, marginBottom: 20 },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    overflow: "hidden",
    marginBottom: 16,
  },
  cardSelected: { borderWidth: 2, borderColor: colors.accent },
  cardBody: { padding: 16 },
  cardLabel: { color: colors.white, fontSize: 20, fontWeight: "800", marginBottom: 4 },
  cardDesc: { color: colors.gray, fontSize: 13, lineHeight: 19 },
  checkBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },

  // Preview mockup
  previewBox: { height: 160, backgroundColor: colors.bgElevated, padding: 16 },
  previewRow: { flexDirection: "row", gap: 6, flex: 1 },
  previewCol: { flex: 1, gap: 6 },
  previewBlock: { backgroundColor: colors.bgInput, borderRadius: 6, flex: 0 },

  // Bottom bar
  bottomBar: { backgroundColor: colors.bg, borderTopWidth: 0.5, borderTopColor: colors.border, paddingHorizontal: 16, paddingTop: 12 },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    minHeight: 56,
    justifyContent: "center",
  },
  saveBtnDisabled: { backgroundColor: colors.bgInput },
  saveBtnText: { color: colors.bg, fontSize: 16, fontWeight: "800" },
  saveBtnTextDisabled: { color: colors.grayDark },
});
