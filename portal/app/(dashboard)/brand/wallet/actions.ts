"use server";

import { redirect } from "next/navigation";
import { api, ApiRequestError } from "@/lib/api";
import type { PaypalOrder, PaypalCaptureResult } from "@/lib/types";

/**
 * Create a PayPal order for the given credit package and redirect the user
 * to PayPal's approval flow. PayPal redirects back to
 * `/brand/wallet/return?token=<order_id>&package_id=<id>` after approval.
 */
export async function startTopupAction(formData: FormData): Promise<void> {
  const packageId = String(formData.get("package_id") ?? "");
  // § 356 Abs. 5 BGB: User muss vor jedem Topup das Erlöschen des
  // Widerrufsrechts aktiv bestätigen. Wir senden den Flag mit ans Backend,
  // das ihn nochmals validiert.
  const waiverAccepted = formData.get("waiver_accepted") === "on";

  if (!packageId) {
    redirect("/brand/wallet?error=missing_package");
  }
  if (!waiverAccepted) {
    redirect("/brand/wallet?error=waiver_required");
  }

  try {
    const order = await api<PaypalOrder>(
      "/api/v1/wallet/topup/paypal/create-order",
      { method: "POST", body: { package_id: packageId, waiver_accepted: true } },
    );
    if (!order.approval_url) {
      redirect("/brand/wallet?error=paypal_unavailable");
    }
    // Stash order_id + package_id in the return URL so the capture step
    // doesn't have to trust user-supplied state.
    const url = new URL(order.approval_url);
    url.searchParams.set("vm_order", order.order_id);
    url.searchParams.set("vm_package", packageId);
    redirect(url.toString());
  } catch (error) {
    // Server Action redirects throw a NEXT_REDIRECT signal — let it bubble.
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if (error instanceof ApiRequestError) {
      const tag =
        error.status === 422 && error.message.toLowerCase().includes("waiver")
          ? "waiver_required"
          : error.status === 422
            ? "unknown_package"
            : "paypal_create_failed";
      redirect(`/brand/wallet?error=${encodeURIComponent(tag)}`);
    }
    redirect("/brand/wallet?error=paypal_create_failed");
  }
}

/**
 * Called from /brand/wallet/return after the user approves the PayPal order.
 * Captures the order on the backend and returns whether the credits landed.
 */
export async function captureTopupAction(orderId: string, packageId: string): Promise<PaypalCaptureResult | { ok: false; reason: string }> {
  try {
    return await api<PaypalCaptureResult>(
      "/api/v1/wallet/topup/paypal/capture",
      { method: "POST", body: { order_id: orderId, package_id: packageId } },
    );
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return { ok: false, reason: error.message };
    }
    return { ok: false, reason: "Unbekannter Fehler" };
  }
}
