import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, Alert, Image, ActivityIndicator, Modal, FlatList, ActionSheetIOS, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { ChevronLeft, Camera, X, Shield, Crown, Search as SearchIcon } from "lucide-react-native";
import { colors } from "../src/constants/theme";
import { communities as communitiesApi, type Community, type CommunityMember } from "../src/lib/api";
import { useAuth } from "../src/lib/store";

export default function CommunitySettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useAuth((s) => s.user);
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const isOwner = community?.owner_id === me?.id;

  useEffect(() => {
    if (!id) return;
    communitiesApi.get(id).then((r) => {
      setCommunity(r.community);
      setDescription(r.community.description ?? "");
      setTags(r.community.tags ?? []);
      setLoading(false);
    }).catch((e: any) => { Alert.alert("Fehler", e.message); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!id || !isOwner) return;
    setLoadingMembers(true);
    communitiesApi.members(id).then((r) => { setMembers(r.members); setLoadingMembers(false); }).catch(() => setLoadingMembers(false));
  }, [id, isOwner]);

  const pickImage = async () => {
    if (!id) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Berechtigung", "Zugriff auf Fotos nötig."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled) return;
    setUploading(true);
    try {
      const { image_url } = await communitiesApi.uploadImage(id, result.assets[0].uri);
      setCommunity((c) => c ? { ...c, image_url } : c);
    } catch (e: any) { Alert.alert("Upload fehlgeschlagen", e.message); }
    setUploading(false);
  };

  const save = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const { community: u } = await communitiesApi.update(id, { description: description.trim() || undefined, tags: tags.length > 0 ? tags : undefined });
      setCommunity(u);
      Alert.alert("Gespeichert");
    } catch (e: any) { Alert.alert("Fehler", e.message); }
    setSaving(false);
  };

  const addTag = () => { const t = newTag.trim().toLowerCase(); if (!t || tags.includes(t) || tags.length >= 10) return; setTags([...tags, t]); setNewTag(""); };
  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const setRole = (member: CommunityMember, role: "member" | "moderator") => {
    if (!id) return;
    const label = role === "moderator" ? "zum Moderator ernennen" : "als Moderator entfernen";
    Alert.alert("Rolle ändern", `Möchtest du ${member.display_name ?? member.username} ${label}?`, [
      { text: "Abbrechen", style: "cancel" },
      { text: "Bestätigen", onPress: async () => {
        try {
          await communitiesApi.setRole(id, member.id, role);
          setMembers((ms) => ms.map((m) => m.id === member.id ? { ...m, role } : m));
        } catch (e: any) { Alert.alert("Fehler", e.message); }
      }},
    ]);
  };

  const muteMember = (member: CommunityMember) => {
    if (!id) return;
    const opts = ["24 Stunden", "7 Tage", "Permanent", "Abbrechen"];
    const durations: Record<number, "24h" | "7d" | "permanent"> = { 0: "24h", 1: "7d", 2: "permanent" };
    const handle = async (idx: number) => {
      if (idx === 3 || idx === undefined) return;
      try {
        const { muted_until } = await communitiesApi.muteUser(id, member.id, durations[idx]);
        setMembers((ms) => ms.map((m) => m.id === member.id ? { ...m, muted_until } : m));
        Alert.alert("Stumm geschaltet");
      } catch (e: any) { Alert.alert("Fehler", e.message); }
    };
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions({ options: opts, cancelButtonIndex: 3, title: "Stumm schalten" }, handle);
    } else {
      Alert.alert("Stumm schalten", undefined, opts.map((o, i) => ({ text: o, style: i === 3 ? "cancel" : "default", onPress: () => handle(i) })));
    }
  };

  const kickMember = (member: CommunityMember) => {
    if (!id) return;
    Alert.alert("Entfernen", `Möchtest du ${member.display_name ?? member.username} wirklich aus der Community entfernen?`, [
      { text: "Abbrechen", style: "cancel" },
      { text: "Entfernen", style: "destructive", onPress: async () => {
        try {
          await communitiesApi.kickUser(id, member.id);
          setMembers((ms) => ms.filter((m) => m.id !== member.id));
        } catch (e: any) { Alert.alert("Fehler", e.message); }
      }},
    ]);
  };

  const openMemberMenu = (member: CommunityMember) => {
    if (member.id === community?.owner_id) return;
    const isMod = member.role === "moderator";
    const isMuted = member.muted_until && new Date(member.muted_until) > new Date();

    const opts: string[] = [];
    if (isOwner) opts.push(isMod ? "Moderator-Rolle entfernen" : "Zum Moderator ernennen");
    opts.push(isMuted ? "Stummschaltung aufheben" : "Stumm schalten");
    opts.push("Aus Community entfernen");
    opts.push("Abbrechen");
    const cancelIdx = opts.length - 1;

    const handle = async (idx: number) => {
      if (idx === cancelIdx) return;
      let offset = 0;
      if (isOwner) {
        if (idx === 0) { setRole(member, isMod ? "member" : "moderator"); return; }
        offset = 1;
      }
      const actionIdx = idx - offset;
      if (actionIdx === 0) {
        if (isMuted) {
          try { await communitiesApi.unmuteUser(id!, member.id); setMembers((ms) => ms.map((m) => m.id === member.id ? { ...m, muted_until: null } : m)); Alert.alert("Stummschaltung aufgehoben"); } catch (e: any) { Alert.alert("Fehler", e.message); }
        } else { muteMember(member); }
      } else if (actionIdx === 1) { kickMember(member); }
    };

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions({ options: opts, cancelButtonIndex: cancelIdx, destructiveButtonIndex: cancelIdx - 1 }, handle);
    } else {
      Alert.alert("Mitglied", undefined, opts.map((o, i) => ({ text: o, style: i === cancelIdx ? "cancel" : i === cancelIdx - 1 ? "destructive" : "default", onPress: () => handle(i) })));
    }
  };

  const deleteCommunity = async () => {
    if (!id) return;
    try { await communitiesApi.destroy(id); setDeleteModalVisible(false); router.replace("/communities"); } catch (e: any) { Alert.alert("Fehler", e.message); }
  };

  const filteredMembers = memberSearch
    ? members.filter((m) => (m.display_name ?? m.username).toLowerCase().includes(memberSearch.toLowerCase()) || m.username.toLowerCase().includes(memberSearch.toLowerCase()))
    : members;

  if (loading) return <SafeAreaView style={s.container} edges={["top"]}><Stack.Screen options={{ headerShown: false }} /><ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} /></SafeAreaView>;

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}><ChevronLeft color={colors.white} size={24} strokeWidth={2} /></Pressable>
        <Text style={s.headerTitle}>Einstellungen</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {/* Profilbild */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Profilbild</Text>
          <View style={s.imageRow}>
            <Pressable onPress={pickImage}>
              {community?.image_url ? <Image source={{ uri: community.image_url }} style={s.imgPreview} /> : <View style={[s.imgPreview, s.imgPlaceholder]}><Camera color={colors.accent} size={28} strokeWidth={1.8} /></View>}
              {uploading && <View style={s.imgOverlay}><ActivityIndicator color="#fff" /></View>}
            </Pressable>
            <Pressable style={s.imgBtn} onPress={pickImage}><Text style={s.imgBtnText}>{uploading ? "Lädt..." : "Bild ändern"}</Text></Pressable>
          </View>
        </View>

        {/* Name */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Community-Name</Text>
          <View style={s.nameBox}><Text style={s.nameText}>{community?.name}</Text></View>
          <Text style={s.hint}>Der Community-Name kann nicht geändert werden.</Text>
        </View>

        {/* Beschreibung */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Beschreibung</Text>
          <TextInput style={s.textArea} value={description} onChangeText={setDescription} placeholder="Worum geht's?" placeholderTextColor={colors.gray} multiline maxLength={500} />
          <Text style={s.counter}>{description.length}/500</Text>
        </View>

        {/* Tags */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Tags</Text>
          <View style={s.tagList}>{tags.map((tag) => <View key={tag} style={s.tag}><Text style={s.tagText}>{tag}</Text><Pressable onPress={() => removeTag(tag)} hitSlop={8}><X color={colors.gray} size={14} strokeWidth={2} /></Pressable></View>)}</View>
          <View style={s.tagInputRow}>
            <TextInput style={s.tagInput} value={newTag} onChangeText={setNewTag} placeholder="Neuen Tag..." placeholderTextColor={colors.gray} maxLength={30} autoCapitalize="none" onSubmitEditing={addTag} returnKeyType="done" />
            <Pressable style={[s.tagAddBtn, !newTag.trim() && { opacity: 0.4 }]} onPress={addTag} disabled={!newTag.trim()}><Text style={s.tagAddText}>+</Text></Pressable>
          </View>
        </View>

        <Pressable style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          <Text style={s.saveBtnText}>{saving ? "Speichert..." : "Änderungen speichern"}</Text>
        </Pressable>

        {/* Rollen-Management (nur Owner) */}
        {isOwner && (
          <View style={[s.section, { marginTop: 32 }]}>
            <Text style={s.sectionTitle}>Mitglieder verwalten</Text>
            <View style={s.memberSearch}>
              <SearchIcon color={colors.gray} size={16} />
              <TextInput style={s.memberSearchInput} placeholder="Mitglied suchen..." placeholderTextColor={colors.gray} value={memberSearch} onChangeText={setMemberSearch} autoCapitalize="none" />
            </View>
            {loadingMembers ? <ActivityIndicator color={colors.accent} style={{ marginTop: 16 }} /> : (
              <View style={{ gap: 6 }}>
                {filteredMembers.map((m) => {
                  const mIsOwner = m.id === community?.owner_id;
                  const mIsMod = m.role === "moderator";
                  const mIsMuted = m.muted_until && new Date(m.muted_until) > new Date();
                  return (
                    <Pressable key={m.id} style={s.memberRow} onPress={() => !mIsOwner && openMemberMenu(m)} disabled={mIsOwner}>
                      {m.avatar_url ? <Image source={{ uri: m.avatar_url }} style={s.memberAvatar} /> : <View style={[s.memberAvatar, s.memberAvatarFallback]}><Text style={s.memberInitial}>{(m.display_name ?? m.username)[0]?.toUpperCase()}</Text></View>}
                      <View style={{ flex: 1 }}>
                        <View style={s.memberNameRow}>
                          <Text style={s.memberName} numberOfLines={1}>{m.display_name ?? m.username}</Text>
                          {mIsOwner && <Crown color="#FFD700" size={14} strokeWidth={2} />}
                          {mIsMod && !mIsOwner && <Shield color={colors.accent} size={14} strokeWidth={2} />}
                        </View>
                        <Text style={s.memberHandle}>@{m.username}</Text>
                        {mIsMuted && <Text style={s.mutedBadge}>Stumm geschaltet</Text>}
                      </View>
                      <Text style={s.memberRole}>{mIsOwner ? "Ersteller" : mIsMod ? "Moderator" : "Mitglied"}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Community löschen (nur Owner) */}
        {isOwner && (
          <Pressable style={s.deleteBtn} onPress={() => setDeleteModalVisible(true)}>
            <Text style={s.deleteBtnText}>Community löschen</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Delete Modal */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={s.modalBackdrop}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Community löschen?</Text>
            <Text style={s.modalText}>Möchtest du diese Community wirklich löschen? Alle Beiträge und Mitglieder gehen verloren. Diese Aktion kann nicht rückgängig gemacht werden.</Text>
            <Text style={s.modalHint}>Tippe <Text style={{ fontWeight: "700" }}>Löschen</Text> ein:</Text>
            <TextInput style={s.modalInput} value={deleteConfirm} onChangeText={setDeleteConfirm} placeholder="Löschen" placeholderTextColor={colors.grayDark} autoCapitalize="none" />
            <View style={s.modalBtns}>
              <Pressable style={s.modalCancel} onPress={() => { setDeleteModalVisible(false); setDeleteConfirm(""); }}><Text style={s.modalCancelText}>Abbrechen</Text></Pressable>
              <Pressable style={[s.modalDelete, deleteConfirm !== "Löschen" && { opacity: 0.35 }]} onPress={deleteCommunity} disabled={deleteConfirm !== "Löschen"}><Text style={s.modalDeleteText}>Endgültig löschen</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, gap: 10 },
  backBtn: { minWidth: 44, minHeight: 44, justifyContent: "center" },
  headerTitle: { flex: 1, color: colors.white, fontSize: 17, fontWeight: "600" },
  section: { marginBottom: 24 },
  sectionTitle: { color: colors.grayDark, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  imageRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  imgPreview: { width: 80, height: 80, borderRadius: 16 },
  imgPlaceholder: { backgroundColor: colors.bgCard, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: colors.border, borderStyle: "dashed" },
  imgOverlay: { position: "absolute", width: 80, height: 80, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  imgBtn: { backgroundColor: colors.bgCard, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, minHeight: 44, justifyContent: "center" },
  imgBtnText: { color: colors.accent, fontSize: 14, fontWeight: "600" },
  nameBox: { backgroundColor: colors.bgCard, borderRadius: 10, padding: 14, opacity: 0.6 },
  nameText: { color: colors.white, fontSize: 15 },
  hint: { color: colors.grayDark, fontSize: 11, marginTop: 4, marginLeft: 4 },
  textArea: { backgroundColor: colors.bgInput, borderRadius: 10, padding: 14, color: colors.white, fontSize: 15, minHeight: 90 },
  counter: { color: colors.grayDark, fontSize: 11, textAlign: "right", marginTop: 4 },
  tagList: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  tag: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.bgCard, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  tagText: { color: colors.white, fontSize: 13 },
  tagInputRow: { flexDirection: "row", gap: 8 },
  tagInput: { flex: 1, backgroundColor: colors.bgInput, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: colors.white, fontSize: 14 },
  tagAddBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.accent, justifyContent: "center", alignItems: "center" },
  tagAddText: { color: "#fff", fontSize: 22, fontWeight: "600" },
  saveBtn: { backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: "center", minHeight: 50 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Members
  memberSearch: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bgInput, borderRadius: 10, paddingHorizontal: 12, height: 40, gap: 8, marginBottom: 12 },
  memberSearchInput: { flex: 1, color: colors.white, fontSize: 14 },
  memberRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bgCard, borderRadius: 12, padding: 12, gap: 10 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20 },
  memberAvatarFallback: { backgroundColor: colors.accent, justifyContent: "center", alignItems: "center" },
  memberInitial: { color: "#fff", fontWeight: "800", fontSize: 16 },
  memberNameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  memberName: { color: colors.white, fontSize: 14, fontWeight: "600", maxWidth: 160 },
  memberHandle: { color: colors.gray, fontSize: 11 },
  memberRole: { color: colors.grayDark, fontSize: 11, fontWeight: "500" },
  mutedBadge: { color: "#EF4444", fontSize: 10, fontWeight: "600", marginTop: 1 },

  // Delete
  deleteBtn: { padding: 16, alignItems: "center", marginTop: 24 },
  deleteBtnText: { color: "#EF4444", fontSize: 15 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 24 },
  modal: { backgroundColor: colors.bgElevated, borderRadius: 16, padding: 24 },
  modalTitle: { color: colors.white, fontSize: 18, fontWeight: "700", marginBottom: 10 },
  modalText: { color: colors.gray, fontSize: 14, lineHeight: 20, marginBottom: 14 },
  modalHint: { color: colors.white, fontSize: 14, marginBottom: 8 },
  modalInput: { backgroundColor: colors.bgInput, borderRadius: 10, padding: 14, color: colors.white, fontSize: 15, marginBottom: 16 },
  modalBtns: { flexDirection: "row", gap: 10 },
  modalCancel: { flex: 1, backgroundColor: colors.bgCard, borderRadius: 10, padding: 14, alignItems: "center", minHeight: 48, justifyContent: "center" },
  modalCancelText: { color: colors.white, fontSize: 15, fontWeight: "600" },
  modalDelete: { flex: 1, backgroundColor: "#EF4444", borderRadius: 10, padding: 14, alignItems: "center", minHeight: 48, justifyContent: "center" },
  modalDeleteText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
