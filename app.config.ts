// app.config.ts
import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "TrusCart",
  slug: "truscart",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "truscart",
  userInterfaceStyle: "dark",
  splash: { backgroundColor: "#111B21" },
  plugins: ["expo-router", "expo-secure-store", "expo-asset"],
  experiments: { typedRoutes: true },
  ios: {
    bundleIdentifier: "com.truscart.app",
    supportsTablet: true,
    privacyManifests: {
      NSPrivacyAccessedAPITypes: [
        { NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults", NSPrivacyAccessedAPITypeReasons: ["CA92.1"] },
        { NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryDiskSpace", NSPrivacyAccessedAPITypeReasons: ["E174.1"] },
      ],
    },
  },
  android: {
    package: "com.truscart.app",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#111B21",
    },
  },
  extra: {
    API_URL: process.env.EXPO_PUBLIC_API_URL ?? "https://app.truscart.com/api",
  },
});
