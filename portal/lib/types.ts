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
