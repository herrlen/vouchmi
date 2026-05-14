export type UserRole = "user" | "influencer" | "brand";

export type AuthUser = {
  id: number;
  email: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  email_verified_at: string | null;
};

export type AuthResponse = {
  user: AuthUser;
  token: string;
};

export type MeResponse = {
  user: AuthUser;
};

export type BrandProfile = {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
  description: string | null;
  subscription_status: "active" | "paused" | "cancelled" | null;
};

export type SponsoredDrop = {
  id: number;
  title: string;
  status: "draft" | "scheduled" | "live" | "ended";
  starts_at: string | null;
  ends_at: string | null;
  community_count: number;
  click_count: number;
};

export type SubscriptionStatus = {
  role: UserRole;
  has_active: boolean;
  plan_type: string | null;
  payment_provider: string | null;
  status: string | null;
  auto_renew: boolean | null;
  expires_at: string | null;
  paypal_status: string | null;
};

// ── Wallet & Boost ──

export type WalletPackage = {
  id: string;
  credits: number;
  price_cents: number;
  currency: string;
  apple_product: string;
  label_key: string;
};

export type WalletTransaction = {
  id: string;
  type: "topup" | "boost_spend" | "refund" | "admin_adjust" | "migration_bonus" | "reversal";
  credits_delta: number;
  amount_cents: number | null;
  currency: string | null;
  provider: "paypal" | "apple_iap" | "admin" | "system" | null;
  status: "pending" | "completed" | "failed" | "reversed";
  created_at: string;
};

export type WalletState = {
  wallet: { id: string; balance_credits: number; currency: string };
  transactions: WalletTransaction[];
};

export type WalletPackagesResponse = {
  enabled: boolean;
  packages: WalletPackage[];
};

export type PaypalOrder = {
  order_id: string;
  approval_url: string;
  status: string;
  package: WalletPackage;
  reference_id: string;
};

export type PaypalCaptureResult = {
  ok: boolean;
  transaction_id: string;
  balance: number;
};

export type BoostTier = "mini" | "standard" | "pro" | "brand_push";
export type BoostStatus = "active" | "expired" | "refunded" | "cancelled";

export type BoostSummary = {
  id: string;
  post_id: string;
  tier: BoostTier;
  multiplier: number;
  credits_spent: number;
  status: BoostStatus;
  starts_at: string | null;
  ends_at: string | null;
  impressions: number;
  clicks: number;
  post_preview: { content?: string; link_title?: string | null } | null;
};
