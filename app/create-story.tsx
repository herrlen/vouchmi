import { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, Image, TextInput, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Video, ResizeMode } from "expo-av";
import { X, ImagePlus, Film } from "lucide-react-native";
import { colors } from "../src/constants/theme";
import { communities as communitiesApi, stories as storiesApi, type Community } from "../src/lib/api";
import { useEffect } from "react";

const MAX_VIDEO_SECONDS = 30;

type MediaItem = {
  uri: string;
  type: "image" | "video";
  duration?: number;
};

export default function CreateStoryScreen() {
  const { cid: preselectedCid } = useLocalSearchParams<{ cid?: string }>();
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [caption, setCaption] = useState("");
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCid, setSelectedCid] = useState<string | null>(preselectedCid ?? null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    communitiesApi.mine()
      .then((r) => {
        setCommunities(r.communities);
        if (preselectedCid && r.communities.some((c) => c.id === preselectedCid)) {
          setSelectedCid(preselectedCid);
        } else if (r.communities.length === 1) {
          setSelectedCid(r.communities[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Berechtigung", "Bitte erlaube den Zugriff auf deine Fotos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      aspect: [9, 16],
    });
    if (result.canceled) return;
    setMedia({ uri: result.assets[0].uri, type: "image" });
  };

  const pickVideo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Berechtigung", "Bitte erlaube den Zugriff auf deine Fotos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      videoMaxDuration: MAX_VIDEO_SECONDS,
      quality: 0.7,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    const durationSec = (asset.duration ?? 0) / 1000;

    if (durationSec > MAX_VIDEO_SECONDS) {
      Alert.alert(
        "Video zu lang",
        `Dein Video ist ${Math.ceil(durationSec)} Sekunden lang. Maximal ${MAX_VIDEO_SECONDS} Sekunden erlaubt. Bitte kürze das Video.`,
      );
      return;
    }

    setMedia({ uri: asset.uri, type: "video", duration: durationSec });
  };

  const clearMedia = () => setMedia(null);

  const submit = async () => {
    if (!media) return Alert.alert("Kein Inhalt", "Wähle ein Bild oder Video aus.");
    if (!selectedCid) return Alert.alert("Community wählen", "Wähle die Community, in der du posten willst.");

    setSubmitting(true);
    try {
      await storiesApi.create(selectedCid, media.uri, media.type, caption.trim() || undefined, media.duration);
      router.back();
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    }
    setSubmitting(false);
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <X color={colors.white} size={24} />
        </Pressable>
        <Text style={s.title}>Story erstellen</Text>
        <Pressable
          onPress={submit}
          disabled={submitting || !media || !selectedCid}
          hitSlop={10}
        >
          <Text style={[s.postBtn, (submitting || !media || !selectedCid) && { opacity: 0.4 }]}>
            {submitting ? "..." : "Posten"}
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {!media ? (
            <View style={s.pickerArea}>
              <Text style={s.pickerEmoji}>📸</Text>
              <Text style={s.pickerTitle}>Wähle ein Bild oder Video</Text>
              <Text style={s.pickerSub}>Videos maximal {MAX_VIDEO_SECONDS} Sekunden</Text>

              <View style={s.pickerBtns}>
                <Pressable style={s.pickerBtn} onPress={pickImage}>
                  <ImagePlus color={colors.accent} size={24} />
                  <Text style={s.pickerBtnText}>Bild</Text>
                </Pressable>
                <Pressable style={s.pickerBtn} onPress={pickVideo}>
                  <Film color={colors.accent} size={24} />
                  <Text style={s.pickerBtnText}>Video</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={s.previewWrap}>
              {media.type === "image" ? (
                <Image source={{ uri: media.uri }} style={s.previewMedia} />
              ) : (
                <Video
                  source={{ uri: media.uri }}
                  style={s.previewMedia}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay={false}
                  useNativeControls
                />
              )}
              {media.type === "video" && media.duration != null && (
                <View style={s.durationBadge}>
                  <Text style={s.durationText}>{Math.ceil(media.duration)}s</Text>
                </View>
              )}
              <Pressable style={s.clearBtn} onPress={clearMedia} hitSlop={8}>
                <X color="#fff" size={18} />
              </Pressable>
            </View>
          )}

          <Text style={s.label}>Beschreibung <Text style={s.labelOpt}>optional</Text></Text>
          <TextInput
            style={s.input}
            value={caption}
            onChangeText={setCaption}
            placeholder="Was gibt's Neues?"
            placeholderTextColor={colors.gray}
            multiline
            maxLength={500}
          />
          <Text style={s.counter}>{caption.length}/500</Text>

          <Text style={s.label}>Community</Text>
          {communities.length === 0 ? (
            <Text style={s.emptyComm}>Keine Communities. Erstelle zuerst eine.</Text>
          ) : (
            <View style={s.commList}>
              {communities.map((c) => (
                <Pressable
                  key={c.id}
                  style={[s.commOption, selectedCid === c.id && s.commOptionOn]}
                  onPress={() => setSelectedCid(c.id)}
                >
                  <Text style={[s.commOptionText, selectedCid === c.id && s.commOptionTextOn]}>{c.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  title: { color: colors.white, fontSize: 17, fontWeight: "600" },
  postBtn: { color: colors.accent, fontSize: 16, fontWeight: "700" },
  pickerArea: { alignItems: "center", paddingVertical: 60 },
  pickerEmoji: { fontSize: 64, marginBottom: 14 },
  pickerTitle: { color: colors.white, fontSize: 18, fontWeight: "700" },
  pickerSub: { color: colors.gray, fontSize: 13, marginTop: 4, marginBottom: 28 },
  pickerBtns: { flexDirection: "row", gap: 16 },
  pickerBtn: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 32,
    alignItems: "center",
    gap: 8,
    minWidth: 120,
    minHeight: 80,
  },
  pickerBtnText: { color: colors.white, fontSize: 14, fontWeight: "600" },
  previewWrap: { borderRadius: 14, overflow: "hidden", position: "relative", marginBottom: 10 },
  previewMedia: { width: "100%", aspectRatio: 9 / 16, maxHeight: 400, backgroundColor: colors.bgCard },
  durationBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  durationText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  clearBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  label: { color: colors.white, fontSize: 13, fontWeight: "600", marginTop: 16, marginBottom: 6 },
  labelOpt: { color: colors.gray, fontWeight: "400" },
  input: { backgroundColor: colors.bgInput, borderRadius: 10, padding: 14, color: colors.white, fontSize: 15, minHeight: 80 },
  counter: { color: colors.gray, fontSize: 11, textAlign: "right", marginTop: 4 },
  emptyComm: { color: colors.gray, fontSize: 13, padding: 14 },
  commList: { gap: 6 },
  commOption: { backgroundColor: colors.bgCard, borderRadius: 10, padding: 14, borderWidth: 2, borderColor: "transparent" },
  commOptionOn: { borderColor: colors.accent },
  commOptionText: { color: colors.white, fontSize: 14, fontWeight: "600" },
  commOptionTextOn: { color: colors.accent },
});
