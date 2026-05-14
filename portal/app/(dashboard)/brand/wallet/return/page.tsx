import { redirect } from "next/navigation";

// PayPal-Return-URL — pass through alle Query-Params an die neue,
// rollen-übergreifende /wallet/return-Route.
type SearchParams = Promise<Record<string, string | undefined>>;

export default async function BrandWalletReturnRedirect({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v) query.set(k, v);
  }
  const qs = query.toString();
  redirect(`/wallet/return${qs ? `?${qs}` : ""}`);
}
