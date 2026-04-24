import "server-only";
import { apiMaybe } from "@/lib/api";

export type PublicProfile = {
  id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: "user" | "influencer" | "brand";
  followers_count: number;
  following_count: number;
};

export type PublicCommunity = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  member_count: number;
};

/**
 * Public profiles use the backend's /api/users/{userId}/profile endpoint,
 * but the web URL takes a username. Until the backend exposes a
 * username-based lookup (see BACKEND-TODO.md) we resolve via a lookup
 * route or return null.
 */
export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  return apiMaybe<PublicProfile>(`/api/users/by-username/${encodeURIComponent(username)}`, {
    next: { revalidate: 60 },
  });
}

export async function getPublicCommunity(slug: string): Promise<PublicCommunity | null> {
  return apiMaybe<PublicCommunity>(`/api/communities/by-slug/${encodeURIComponent(slug)}`, {
    next: { revalidate: 60 },
  });
}
