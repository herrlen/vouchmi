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
  splash: { backgroundColor: "#0A0E1A" },
  plugins: ["expo-router", "expo-secure-store"],
  experiments: { typedRoutes: true },
  ios: {
    bundleIdentifier: "com.truscart.app",
    supportsTablet: true,
  },
  android: {
    package: "com.truscart.app",
    adaptiveIcon: { backgroundColor: "#0A0E1A" },
  },
  extra: {
    API_URL: process.env.EXPO_PUBLIC_API_URL ?? "https://app.truscart.com/api",
  },
});
