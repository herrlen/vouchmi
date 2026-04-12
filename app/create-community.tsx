import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView, Image } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Camera } from "lucide-react-native";
import * as api from "../src/lib/api";
import { useApp } from "../src/lib/store";
import { colors } from "../src/constants/theme";

const CATEGORIES = ["Tech", "Fashion", "Food", "Home", "Sports", "Beauty", "Gaming", "Finance", "Travel", "Fitness"];

export default function CreateCommunity() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const loadCommunities = useApp((s) => s.loadCommunities);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Berechtigung", "Bitte erlaube den Zugriff auf deine Fotos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleCreate = async () => {
    if (!name.trim()) return Alert.alert("Fehler", "Gib deiner Community einen Namen");
    setLoading(true);
    try {
      await api.communities.create({
        name: name.trim(),
        description: description.trim() || undefined,
        category: category || undefined,
      });
      await loadCommunities();
      router.back();
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <View style={s.imageSection}>
        <Pressable style={s.imageBtn} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={s.imagePreview} />
          ) : (
            <View style={s.imagePlaceholder}>
              <Camera color={colors.accent} size={32} />
              <Text style={s.imageHint}>Profilbild</Text>
            </View>
          )}
        </Pressable>
        {imageUri && (
          <Pressable onPress={() => setImageUri(null)}>
            <Text style={s.removeText}>Entfernen</Text>
          </Pressable>
        )}
      </View>

      <Text style={s.label}>Name *</Text>
      <TextInput style={s.input} placeholder="z.B. Kaffee-Nerds Hamburg" placeholderTextColor={colors.grayDark}
        value={name} onChangeText={setName} maxLength={100} />

      <Text style={s.label}>Beschreibung</Text>
      <TextInput style={[s.input, { height: 80, textAlignVertical: "top" }]} placeholder="Worum geht's?"
        placeholderTextColor={colors.grayDark} value={description} onChangeText={setDescription} multiline maxLength={500} />

      <Text style={s.label}>Kategorie</Text>
      <View style={s.cats}>
        {CATEGORIES.map((c) => (
          <Pressable key={c} style={[s.cat, category === c.toLowerCase() && s.catActive]}
            onPress={() => setCategory(category === c.toLowerCase() ? "" : c.toLowerCase())}>
            <Text style={[s.catText, category === c.toLowerCase() && s.catTextActive]}>{c}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={[s.btn, loading && { opacity: 0.6 }]} onPress={handleCreate} disabled={loading}>
        <Text style={s.btnText}>{loading ? "Wird erstellt..." : "Community erstellen"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  imageSection: { alignItems: "center", marginBottom: 10 },
  imageBtn: { width: 100, height: 100, borderRadius: 20, overflow: "hidden" },
  imagePreview: { width: 100, height: 100, borderRadius: 20 },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: colors.bgCard,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    gap: 4,
  },
  imageHint: { color: colors.gray, fontSize: 11, fontWeight: "500" },
  removeText: { color: colors.red, fontSize: 13, marginTop: 8 },
  label: { color: colors.gray, fontSize: 13, fontWeight: "600", marginBottom: 6, marginTop: 20, textTransform: "uppercase", letterSpacing: 0.8 },
  input: { backgroundColor: colors.bgInput, borderRadius: 12, padding: 16, color: colors.white, fontSize: 16, borderWidth: 1, borderColor: colors.border },
  cats: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cat: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  catActive: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  catText: { color: colors.gray, fontSize: 14 },
  catTextActive: { color: colors.accent },
  btn: { backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 32 },
  btnText: { color: colors.bg, fontSize: 16, fontWeight: "bold" },
});
