import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { push as pushApi } from "./api";

// Speichert den zuletzt registrierten Token, damit wir ihn beim Logout
// gezielt zum Backend schicken können (Unregister braucht den Token im Body).
const TOKEN_KEY = "vouchmi_push_token";

let foregroundHandlerSet = false;
function ensureForegroundHandler() {
  if (foregroundHandlerSet) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    foregroundHandlerSet = true;
  } catch {}
}

/**
 * Fragt Permission und registriert den nativen APNs-Token beim Backend.
 * Idempotent — kann mehrfach aufgerufen werden (z.B. bei jedem Login).
 * Gibt true zurück, wenn ein Token erfolgreich registriert wurde.
 *
 * Simulator/Sandbox haben keinen APNs-Token; getDevicePushTokenAsync wirft
 * dann, was wir hier still abfangen.
 */
export async function registerForPushNotifications(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  ensureForegroundHandler();

  try {
    const settings = await Notifications.getPermissionsAsync();
    let status = settings.status;
    if (status !== "granted") {
      const req = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowSound: true, allowBadge: true },
      });
      status = req.status;
    }
    if (status !== "granted") return false;

    const tokenResp = await Notifications.getDevicePushTokenAsync();
    const token = tokenResp.data;
    if (!token || typeof token !== "string") return false;

    const appVersion = (Constants.expoConfig?.version ?? undefined) as string | undefined;
    await pushApi.register(token, "ios", appVersion);
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    return true;
  } catch (e) {
    console.warn("[push] register failed:", (e as any)?.message ?? e);
    return false;
  }
}

/** Entfernt den aktuellen Token im Backend (Logout). */
export async function unregisterPushNotifications(): Promise<void> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) return;
    await pushApi.unregister(token).catch(() => {});
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {}
}

/**
 * Tap-Handler: leitet Pushes auf das passende Screen weiter.
 * Aufrufen in der App-Wurzel (z.B. _layout.tsx). Gibt Unsubscribe zurück.
 */
export function setupPushTapListener(): () => void {
  ensureForegroundHandler();
  const handle = (data: any) => {
    if (!data || typeof data !== "object") return;
    const type = data.type;
    const userId = data.user_id;
    if (type === "follow" && userId) router.push(`/user/${userId}`);
    else if (type === "dm" && userId) router.push({ pathname: "/messages/[userId]", params: { userId } });
  };

  // Cold-start: App war geschlossen, User hat Push getippt.
  Notifications.getLastNotificationResponseAsync().then((resp) => {
    if (resp?.notification?.request?.content?.data) {
      handle(resp.notification.request.content.data);
    }
  });

  // Warm: User tippt Push, App ist im Hintergrund/Foreground.
  const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
    handle(resp.notification.request.content.data);
  });

  return () => sub.remove();
}
