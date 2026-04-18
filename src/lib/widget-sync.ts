import { Platform } from "react-native";
import { widget as widgetApi } from "./api";

/**
 * Syncs the "Empfehlung des Tages" data to App Group UserDefaults
 * so the iOS widget can read it. No-op on Android.
 *
 * Uses @bacons/apple-targets ExtensionStorage when available (EAS build).
 * In Expo Go this silently no-ops since native modules aren't available.
 */
export async function syncDailyRecommendation(): Promise<void> {
  if (Platform.OS !== "ios") return;

  try {
    const data = await widgetApi.daily();

    // Try to load ExtensionStorage dynamically — only available in EAS builds
    let ExtensionStorage: any;
    try {
      ExtensionStorage = require("@bacons/apple-targets").ExtensionStorage;
    } catch {
      // Not available (Expo Go) — skip
      return;
    }

    const storage = new ExtensionStorage("group.com.vouchmi.app");

    const payload = {
      uuid: data.uuid,
      communityUuid: data.communityUuid,
      communityName: data.communityName,
      communityEmoji: data.communityEmoji,
      communityAccentColor: data.communityAccentColor,
      productTitle: data.productTitle,
      productImageLocalPath: "", // TODO: download to App Group container in EAS build
      domain: data.domain,
      voucherName: data.voucherName,
      voucherAvatarLocalPath: "",
      voucherCount: data.voucherCount,
      deepLinkUrl: data.deepLinkUrl,
      updatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    };

    await storage.set("daily_recommendation", JSON.stringify(payload));
    await storage.reloadWidget();
  } catch (err) {
    console.warn("[widgetSync] failed to sync:", err);
  }
}
