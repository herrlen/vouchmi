/**
 * iapService.ts — StoreKit 2 IAP via react-native-iap v15
 *
 * WICHTIG: react-native-iap nutzt NitroModules und crasht in Expo Go.
 * Alle Imports sind daher lazy (require) und werden nur auf nativen
 * Builds ausgefuehrt. In Expo Go geben alle Funktionen graceful No-Ops zurueck.
 */

import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { api } from "../lib/api";

// ── Product IDs (App Store Connect) ──
export const IAP_PRODUCTS = {
  influencer: "com.vouchmi.app.influencer.monthly",
  brand: "com.vouchmi.app.brand.monthly",
} as const;

const SKU_LIST = [IAP_PRODUCTS.influencer, IAP_PRODUCTS.brand];

export type IapPlanType = keyof typeof IAP_PRODUCTS;

// ── Expo Go Detection ──
// react-native-iap braucht NitroModules und crasht in Expo Go.
// Wir pruefen ob wir in Expo Go laufen (kein nativer Build).
import Constants from "expo-constants";

const isExpoGo = Constants.executionEnvironment === "storeClient";
let iapModule: any = null;

function getIap(): any {
  if (iapModule) return iapModule;
  if (isExpoGo || Platform.OS !== "ios") return null;
  // Nur in nativen Builds (expo prebuild / EAS Build) importieren
  iapModule = require("react-native-iap");
  return iapModule;
}

// ── State ──
let connected = false;

// ── Platform Check ──

export function isIapPlatform(): boolean {
  return Platform.OS === "ios";
}

/**
 * True wenn react-native-iap geladen werden konnte (= nativer Build).
 * False in Expo Go.
 */
export function isIapAvailable(): boolean {
  if (!isIapPlatform()) return false;
  return getIap() !== null;
}

// ── Connection ──

export async function iapInit(): Promise<void> {
  if (!isIapPlatform() || connected) return;
  const iap = getIap();
  if (!iap) return;
  await iap.initConnection();
  connected = true;
}

export async function iapEnd(): Promise<void> {
  if (!connected) return;
  const iap = getIap();
  if (!iap) return;
  await iap.endConnection();
  connected = false;
}

// ── Products ──

export async function iapGetProducts(): Promise<any[]> {
  if (!isIapAvailable()) return [];
  if (!connected) await iapInit();
  const iap = getIap();
  const result = await iap.fetchProducts({ skus: SKU_LIST, type: "subs" });
  return (result as any[] | null) ?? [];
}

// ── Purchase ──

export async function iapRequestSubscription(productId: string): Promise<any> {
  const iap = getIap();
  if (!iap) throw { code: "E_NOT_AVAILABLE", message: "In-App-Kaeufe sind in dieser Umgebung nicht verfuegbar." };
  if (!connected) await iapInit();

  try {
    const result = await iap.requestPurchase({
      type: "subs",
      request: { apple: { sku: productId } },
    });
    const p = Array.isArray(result) ? result[0] : result;

    if (!p) {
      throw { code: "E_NO_PURCHASE", message: "Kein Kauf erhalten." };
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return p;
  } catch (err: any) {
    if (err.code === "E_USER_CANCELLED" || err.message?.includes("cancelled")) {
      throw { code: "E_USER_CANCELLED", message: "Der Kauf wurde abgebrochen." };
    }
    if (err.code === "E_DEFERRED" || err.message?.includes("deferred")) {
      throw { code: "E_DEFERRED", message: "Der Kauf wartet auf Genehmigung (z.B. Ask to Buy)." };
    }
    throw {
      code: err.code ?? "E_PURCHASE_FAILED",
      message: mapIapError(err),
    };
  }
}

// ── Finish ──

export async function iapFinish(purchase: any): Promise<void> {
  const iap = getIap();
  if (!iap) return;
  await iap.finishTransaction({ purchase, isConsumable: false });
}

// ── Restore ──

export async function iapRestore(): Promise<any[]> {
  const iap = getIap();
  if (!iap) return [];
  if (!connected) await iapInit();
  return iap.getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
}

// ── Server Verification ──

export async function iapVerifyWithBackend(
  purchase: any,
  productId: string
): Promise<{ verified: boolean }> {
  return api.post<{ verified: boolean }>("/v1/iap/verify-receipt", {
    transaction_id: purchase.id,
    original_transaction_id:
      purchase.originalTransactionIdentifierIOS ?? purchase.id,
    product_id: productId,
  });
}

// ── Listeners ──

export function iapListenForUpdates(
  onPurchase: (purchase: any) => void,
  onError: (error: any) => void
): () => void {
  const iap = getIap();
  if (!iap) return () => {};

  const updateSub = iap.purchaseUpdatedListener(onPurchase);
  const errorSub = iap.purchaseErrorListener(onError);

  return () => {
    updateSub.remove();
    errorSub.remove();
  };
}

// ── Error Mapping (deutsche, HIG-konforme Meldungen) ──

function mapIapError(err: any): string {
  const code = String(err.code ?? "");
  const msg = String(err.message ?? "");

  if (code.includes("CANCELLED") || msg.includes("cancelled"))
    return "Der Kauf wurde abgebrochen.";
  if (code.includes("DEFERRED") || msg.includes("deferred"))
    return "Der Kauf wartet auf Genehmigung.";
  if (code.includes("UNAVAILABLE") || msg.includes("unavailable"))
    return "Dieses Abo ist derzeit nicht verfuegbar.";
  if (code.includes("NETWORK") || msg.includes("network"))
    return "Keine Internetverbindung. Bitte versuche es erneut.";
  if (code.includes("SERVICE") || msg.includes("service"))
    return "Der App Store ist voruebergehend nicht erreichbar.";
  if (msg.includes("payment"))
    return "Die Zahlung konnte nicht verarbeitet werden.";

  return "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.";
}
