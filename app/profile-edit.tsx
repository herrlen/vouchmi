import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, TextInput, ScrollView, Alert, Image, ActivityIndicator, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { ChevronLeft, Pencil, Check } from "lucide-react-native";
import { colors } from "../src/constants/theme";
import { profile as profileApi } from "../src/lib/api";
import { useAuth } from "../src/lib/store";

export default function ProfileScreen() {
  const meUser = useAuth((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [link, setLink] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [stats, setStats] = useState({ communities_count: 0, posts_count: 0 });

  const load = async () => {
    try {
      const { profile, stats } = await profileApi.get();
      setDisplayName(profile.display_name ?? "");
      setBio(profile.bio ?? "");
      setLink(profile.link ?? "");
      setAvatarUrl(profile.avatar_url);
      setStats(stats);
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Keine Berechtigung", "Bitte erlaube den Zugriff auf deine Fotos in den Einstellungen.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      const { avatar_url } = await profileApi.uploadAvatar(result.assets[0].uri);
      setAvatarUrl(avatar_url);
    } catch (e: any) {
      Alert.alert("Upload fehlgeschlagen", e.message);
    }
    setUploading(false);
  };

  const save = async () => {
    if (link && !/^https?:\/\//i.test(link)) {
      Alert.alert("Ungültig", "Link muss mit http:// oder https:// beginnen.");
      return;
    }
    setSaving(true);
    try {
      await profileApi.update({
        display_name: displayName || undefined,
        bio: bio || undefined,
        link: link || undefined,
      });
      setEditing(false);
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.iconBtn} hitSlop={10}>
          <ChevronLeft color={colors.white} size={26} strokeWidth={2} />
        </Pressable>
        <Text style={s.title}>Profil</Text>
        <Pressable onPress={() => editing ? save() : setEditing(true)} style={s.iconBtn} hitSlop={10} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={colors.accent} size="small" />
          ) : editing ? (
            <Check color={colors.accent} size={24} strokeWidth={2.4} />
          ) : (
            <Pencil color={colors.white} size={20} strokeWidth={2} />
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <Pressable onPress={pickAvatar} style={s.avatarWrap}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, s.avatarPlaceholder]}>
              <Text style={s.avatarInitial}>
                {(displayName || meUser?.username || "?")[0].toUpperCase()}
              </Text>
            </View>
          )}
          {uploading && (
            <View style={s.avatarOverlay}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
          <Text style={s.avatarHint}>{uploading ? "Lädt hoch..." : "Foto ändern"}</Text>
        </Pressable>

        <Text style={s.username}>@{meUser?.username}</Text>

        <View style={s.statsRow}>
          <Stat value={stats.posts_count} label="Posts" />
          <Stat value={stats.communities_count} label="Communities" />
        </View>

        <View style={s.field}>
          <Text style={s.label}>Anzeigename</Text>
          {editing ? (
            <TextInput
              style={s.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Dein Name"
              placeholderTextColor={colors.grayDark}
              maxLength={50}
            />
          ) : (
            <Text style={s.value}>{displayName || "—"}</Text>
          )}
        </View>

        <View style={s.field}>
          <Text style={s.label}>Beschreibung</Text>
          {editing ? (
            <TextInput
              style={[s.input, { height: 80 }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Erzähl kurz was über dich (max. 250 Zeichen)"
              placeholderTextColor={colors.grayDark}
              multiline
              maxLength={250}
            />
          ) : (
            <Text style={s.value}>{bio || "—"}</Text>
          )}
          {editing && <Text style={s.counter}>{bio.length}/250</Text>}
        </View>

        <View style={s.field}>
          <Text style={s.label}>Link</Text>
          {editing ? (
            <TextInput
              style={s.input}
              value={link}
              onChangeText={setLink}
              placeholder="https://..."
              placeholderTextColor={colors.grayDark}
              autoCapitalize="none"
              keyboardType="url"
            />
          ) : link ? (
            <Pressable onPress={() => Linking.openURL(link)}>
              <Text style={[s.value, { color: colors.accent }]}>{link}</Text>
            </Pressable>
          ) : (
            <Text style={s.value}>—</Text>
          )}
        </View>

        {editing && (
          <Pressable style={s.cancelBtn} onPress={() => { setEditing(false); load(); }}>
            <Text style={s.cancelText}>Abbrechen</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { color: colors.white, fontSize: 18, fontWeight: "600" },
  content: { padding: 20, paddingBottom: 60 },
  avatarWrap: { alignItems: "center", marginBottom: 10 },
  avatar: { width: 110, height: 110, borderRadius: 55, backgroundColor: colors.bgCard },
  avatarPlaceholder: { justifyContent: "center", alignItems: "center" },
  avatarInitial: { color: colors.white, fontSize: 42, fontWeight: "700" },
  avatarOverlay: { position: "absolute", top: 0, left: "50%", marginLeft: -55, width: 110, height: 110, borderRadius: 55, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  avatarHint: { color: colors.accent, marginTop: 10, fontSize: 13 },
  username: { color: colors.gray, textAlign: "center", fontSize: 15, marginBottom: 20 },
  statsRow: { flexDirection: "row", justifyContent: "space-around", backgroundColor: colors.bgCard, borderRadius: 12, paddingVertical: 16, marginBottom: 24 },
  stat: { alignItems: "center" },
  statValue: { color: colors.white, fontSize: 22, fontWeight: "700" },
  statLabel: { color: colors.grayDark, fontSize: 12, marginTop: 2 },
  field: { marginBottom: 18 },
  label: { color: colors.grayDark, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, marginLeft: 4 },
  value: { color: colors.white, fontSize: 15, backgroundColor: colors.bgCard, padding: 14, borderRadius: 12, minHeight: 48 },
  input: { color: colors.white, fontSize: 15, backgroundColor: colors.bgCard, padding: 14, borderRadius: 12 },
  counter: { color: colors.grayDark, fontSize: 11, textAlign: "right", marginTop: 4 },
  cancelBtn: { padding: 14, alignItems: "center", marginTop: 8 },
  cancelText: { color: colors.gray, fontSize: 15 },
});
