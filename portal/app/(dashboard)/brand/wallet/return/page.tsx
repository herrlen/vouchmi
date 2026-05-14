import { redirect } from "next/navigation";
import { requireRole } from "../../../role-guard";
import { captureTopupAction } from "../actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  vm_order?: string;
  vm_package?: string;
  token?: string;
  PayerID?: string;
}>;

/**
 * PayPal return URL. Captures the order on the backend and redirects back to
 * /brand/wallet with a success/error flag in the query string.
 *
 * vm_order + vm_package are passed through by startTopupAction so the user
 * cannot tamper with which package they're capturing.
 */
export default async function PaypalReturnPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole("brand");
  const sp = await searchParams;

  // PayPal sometimes appends its own `token` (= order id) instead of forwarding
  // our `vm_order`. Prefer ours; fall back to theirs.
  const orderId = sp.vm_order ?? sp.token ?? "";
  const packageId = sp.vm_package ?? "";

  if (!orderId || !packageId) {
    redirect("/brand/wallet?error=capture_failed");
  }

  const result = await captureTopupAction(orderId, packageId);

  if ("ok" in result && result.ok) {
    redirect(`/brand/wallet?ok=1&balance=${result.balance}`);
  }

  const reason = "ok" in result ? "capture_failed" : "capture_failed";
  // Pass through known backend errors for nicer copy.
  const msg = "reason" in result ? result.reason.toLowerCase() : "";
  const tag = msg.includes("ownership")
    ? "ownership_mismatch"
    : msg.includes("amount")
      ? "amount_mismatch"
      : reason;

  redirect(`/brand/wallet?error=${encodeURIComponent(tag)}`);
}
