import { View, Text, Pressable, StyleSheet, FlatList, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react-native";
import { colors } from "../src/constants/theme";
import { moderation, type User } from "../src/lib/api";

export default function BlockedUsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { users } = await moderation.blockedUsers();
      setUsers(users);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const unblock = (u: User) => {
    Alert.alert("Blockierung aufheben?", `${u.display_name ?? u.username} wird wieder sichtbar.`, [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Aufheben",
        onPress: async () => {
          try {
            await moderation.unblock(u.id);
            setUsers((prev) => prev.filter((x) => x.id !== u.id));
          } catch (e: any) {
            Alert.alert("Fehler", e.message);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.iconBtn} hitSlop={10} accessibilityRole="button" accessibilityLabel="Zurueck">
          <ChevronLeft color={colors.white} size={26} strokeWidth={2} />
        </Pressable>
        <Text style={s.title} accessibilityRole="header">Blockierte Nutzer</Text>
        <View style={s.iconBtn} />
      </View>

      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <Text style={s.empty}>{loading ? "" : "Du hast noch niemanden blockiert."}</Text>
        }
        renderItem={({ item }) => (
          <Pressable style={s.row} onPress={() => unblock(item)} accessibilityRole="button" accessibilityLabel={`Blockierung von ${item.display_name ?? item.username} aufheben`}>
            <Text style={s.name}>{item.display_name ?? item.username}</Text>
            <Text style={s.action}>Aufheben</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { color: colors.white, fontSize: 18, fontWeight: "600" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.bgCard, padding: 14, borderRadius: 12, marginBottom: 6 },
  name: { color: colors.white, fontSize: 15 },
  action: { color: colors.accent, fontSize: 14 },
  empty: { color: colors.gray, textAlign: "center", marginTop: 40, fontSize: 14 },
});
