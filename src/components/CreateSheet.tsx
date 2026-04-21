import { useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated, Modal, TouchableWithoutFeedback, Platform } from "react-native";
import { router } from "expo-router";
import { Link as LinkIcon } from "lucide-react-native";
import { colors } from "../constants/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  communityId?: string;
};

export default function CreateSheet({ visible, onClose, communityId }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const onShow = () => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  };

  const close = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => onClose());
  };

  const pick = (route: string) => {
    close();
    const params = communityId ? `?cid=${communityId}` : "";
    setTimeout(() => router.push(route + params), 180);
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onShow={onShow}>
      <TouchableWithoutFeedback onPress={close}>
        <Animated.View style={[s.backdrop, { opacity: fadeAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                s.sheet,
                { transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [200, 0] }) }] },
              ]}
            >
              <View style={s.handle} />
              <Text style={s.title}>Was möchtest du teilen?</Text>

              <Pressable style={s.option} onPress={() => pick("/create-post")}>
                <View style={s.icon}><LinkIcon color={colors.accent} size={22} strokeWidth={1.8} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.optionTitle}>Reco erstellen</Text>
                  <Text style={s.optionSub}>Produkt-Link teilen mit Preview</Text>
                </View>
              </Pressable>

              <Pressable style={s.cancel} onPress={close}>
                <Text style={s.cancelText}>Abbrechen</Text>
              </Pressable>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.bgElevated, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Platform.OS === "ios" ? 44 : 24 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.grayDark, alignSelf: "center", marginBottom: 16 },
  title: { color: colors.white, fontSize: 18, fontWeight: "700", marginBottom: 16 },
  option: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, minHeight: 60 },
  icon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.accentDim, justifyContent: "center", alignItems: "center" },
  optionTitle: { color: colors.white, fontSize: 16, fontWeight: "600" },
  optionSub: { color: colors.gray, fontSize: 13, marginTop: 1 },
  cancel: { marginTop: 10, paddingVertical: 14, alignItems: "center", minHeight: 44 },
  cancelText: { color: colors.gray, fontSize: 15, fontWeight: "500" },
});
