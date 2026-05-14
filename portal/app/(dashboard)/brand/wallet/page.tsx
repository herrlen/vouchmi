import { redirect } from "next/navigation";

// Wallet ist jetzt rollen-übergreifend unter /wallet erreichbar.
// Diese Route bleibt als Backwards-Compatibility-Redirect bestehen, damit
// Bookmarks und alte Sidebar-Links nicht brechen.
export default function BrandWalletRedirect() {
  redirect("/wallet");
}
