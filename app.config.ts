// app.config.ts
import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Vouchmi",
  slug: "vouchmi",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "vouchmi",
  userInterfaceStyle: "dark",
  splash: { backgroundColor: "#1A1D2E" },
  plugins: ["expo-router", "expo-secure-store", "expo-asset"],
  experiments: { typedRoutes: true },
  ios: {
    bundleIdentifier: "com.vouchmi.app",
    supportsTablet: true,
    privacyManifests: {
      NSPrivacyAccessedAPITypes: [
        { NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults", NSPrivacyAccessedAPITypeReasons: ["CA92.1"] },
        { NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryDiskSpace", NSPrivacyAccessedAPITypeReasons: ["E174.1"] },
      ],
    },
  },
  android: {
    package: "com.vouchmi.app",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#1A1D2E",
    },
  },
  extra: {
    API_URL: process.env.EXPO_PUBLIC_API_URL ?? "https://app.vouchmi.com/api",
  },
});
