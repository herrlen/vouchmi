// app/create-community.tsx
import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import * as api from "../src/lib/api";
import { useApp } from "../src/lib/store";
import { colors } from "../src/constants/theme";

const CATEGORIES = ["Tech", "Fashion", "Food", "Home", "Sports", "Beauty", "Gaming", "Finance", "Travel", "Fitness"];

export default function CreateCommunity() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const loadCommunities = useApp((s) => s.loadCommunities);

  const handleCreate = async () => {
    if (!name.trim()) return Alert.alert("Fehler", "Gib deiner Community einen Namen");
    setLoading(true);
    try {
      await api.communities.create({ name: name.trim(), description: description.trim() || undefined, category: category || undefined });
      await loadCommunities();
      router.back();
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 20 }}>
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
