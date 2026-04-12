// src/lib/api.ts
import * as SecureStore from "expo-secure-store";

const API = process.env.EXPO_PUBLIC_API_URL ?? "https://app.truscart.com/api";

async function req<T>(method: string, path: string, body?: any, noAuth?: boolean): Promise<T> {
  const isForm = body instanceof FormData;
  const h: Record<string, string> = { Accept: "application/json" };
  if (!isForm) h["Content-Type"] = "application/json";
  if (!noAuth) {
    const t = await SecureStore.getItemAsync("token");
    if (t) h["Authorization"] = `Bearer ${t}`;
  }
  const r = await fetch(`${API}${path}`, {
    method,
    headers: h,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  if (!r.ok) {
    const text = await r.text();
    let parsed: any = {};
    try { parsed = JSON.parse(text); } catch {}
    const msg = parsed.message || parsed.error || text || `HTTP ${r.status}`;
    console.warn(`[API ${r.status}] ${method} ${path}:`, msg);
    throw new Error(msg);
  }
  return r.json();
}

export const api = {
  get: <T>(p: string) => req<T>("GET", p),
  post: <T>(p: string, b?: any) => req<T>("POST", p, b),
  put: <T>(p: string, b?: any) => req<T>("PUT", p, b),
  del: <T>(p: string) => req<T>("DELETE", p),
};

export const profile = {
  get: () => api.get<{ profile: User & { bio: string | null; link: string | null }; stats: { communities_count: number; posts_count: number } }>("/user/profile"),
  update: (d: { display_name?: string; bio?: string; link?: string }) =>
    api.put<{ profile: User }>("/user/profile", d),
  uploadAvatar: async (uri: string) => {
    const form = new FormData();
    const filename = uri.split("/").pop() || "avatar.jpg";
    const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
    const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    // @ts-expect-error RN FormData file
    form.append("avatar", { uri, name: filename, type });
    return req<{ avatar_url: string }>("POST", "/user/avatar", form);
  },
};

export const auth = {
  register: (d: { email: string; username: string; password: string; accept_terms: boolean }) => req<{ user: User; token: string }>("POST", "/auth/register", d, true),
  login: (email: string, password: string) => req<{ user: User; token: string }>("POST", "/auth/login", { email, password }, true),
  logout: () => api.post("/auth/logout"),
  me: () => api.get<{ user: User }>("/auth/me"),
};

export const communities = {
  mine: () => api.get<{ communities: Community[] }>("/communities"),
  discover: () => api.get<{ communities: Community[] }>("/communities/discover"),
  get: (id: string) => api.get<{ community: Community }>(`/communities/${id}`),
  create: (d: { name: string; description?: string; category?: string }) => api.post<{ community: Community }>("/communities", d),
  join: (id: string) => api.post(`/communities/${id}/join`),
  leave: (id: string) => api.post(`/communities/${id}/leave`),
  invite: (id: string) => api.post<{ invite_code: string; invite_link: string }>(`/communities/${id}/invite`),
};

export const feed = {
  list: (cid: string, page = 1) => api.get<{ data: Post[]; last_page: number }>(`/communities/${cid}/feed?page=${page}`),
  all: (page = 1) => api.get<{ data: Post[]; last_page: number }>(`/feed?page=${page}`),
  mine: (page = 1) => api.get<{ data: Post[]; last_page: number }>(`/user/posts?page=${page}`),
  create: (cid: string, d: { content?: string; link_url: string; link_title?: string; link_image?: string; link_price?: number }) =>
    api.post<{ post: Post }>(`/communities/${cid}/feed`, d),
  like: (pid: string) => api.post<{ like_count: number; liked: boolean }>(`/feed/${pid}/like`),
  comment: (pid: string, content: string) => api.post<{ comment: Comment }>(`/feed/${pid}/comment`, { content }),
  comments: (pid: string) => api.get<{ comments: Comment[] }>(`/feed/${pid}/comments`),
};

export const chat = {
  messages: (cid: string, after?: string) => api.get<{ messages: Msg[] }>(`/communities/${cid}/messages${after ? `?after=${after}` : ""}`),
  send: (cid: string, content: string, link_url?: string) => api.post<{ message: Msg }>(`/communities/${cid}/messages`, { content, link_url }),
};

export const links = {
  preview: (url: string) => req<{ preview: LinkPreview }>("GET", `/link-preview?url=${encodeURIComponent(url)}`, undefined, true),
  trackClick: (d: { post_id?: string; community_id?: string; original_url: string; affiliate_url: string }) => api.post("/track/click", d),
};

export type Brand = {
  id: string;
  brand_name: string;
  brand_slug: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  industry: string | null;
  is_verified: boolean;
};

export const brand = {
  me: () => api.get<{ brand: Brand | null }>("/brand/me"),
  public: (slug: string) => api.get<{ brand: Brand }>(`/brands/${slug}`),
};

export const moderation = {
  report: (d: { target_type: "post" | "comment" | "user" | "community"; target_id: string; reason: "spam" | "abuse" | "illegal" | "sexual" | "other"; details?: string }) =>
    api.post<{ message: string }>("/reports", d),
  block: (userId: string) => api.post<{ message: string }>(`/users/${userId}/block`),
  unblock: (userId: string) => api.del<{ message: string }>(`/users/${userId}/block`),
  blockedUsers: () => api.get<{ users: User[] }>("/users/blocked"),
  deleteAccount: () => req<{ message: string }>("DELETE", "/account", { confirm: "DELETE" }),
};

export const drops = {
  list: (cid: string) => api.get<{ drops: Drop[] }>(`/communities/${cid}/drops`),
  vote: (did: string, vote: boolean) => api.post(`/drops/${did}/vote`, { vote }),
};

// Types
export type User = { id: string; email: string; username: string; display_name: string | null; avatar_url: string | null; role: string };
export type Community = { id: string; name: string; slug: string; description: string | null; image_url: string | null; category: string | null; member_count: number; is_private: boolean; role?: string; is_member?: boolean; my_role?: string };
export type Post = { id: string; community_id: string; content: string; post_type: string; link_url: string | null; link_affiliate_url: string | null; link_title: string | null; link_image: string | null; link_price: number | null; link_domain: string | null; like_count: number; comment_count: number; click_count: number; created_at: string; author: { id: string; username: string; display_name: string; avatar_url: string | null } };
export type Comment = { id: string; content: string; created_at: string; author: { id: string; username: string; display_name: string; avatar_url: string | null } };
export type Msg = { id: string; content: string; link_url: string | null; link_title: string | null; link_image: string | null; link_price: number | null; created_at: string; sender: { id: string; username: string; display_name: string; avatar_url: string | null } };
export type LinkPreview = { original_url: string; affiliate_url: string; title: string | null; image: string | null; price: number | null; domain: string };
export type Drop = { id: string; title: string; description: string | null; product_url: string | null; discount_code: string | null; discount_percent: number | null; image_url: string | null; votes_yes: number; votes_no: number; status: string };
