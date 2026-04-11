// src/lib/api.ts
import * as SecureStore from "expo-secure-store";

const API = process.env.EXPO_PUBLIC_API_URL ?? "https://app.truscart.com/api";

async function req<T>(method: string, path: string, body?: any, noAuth?: boolean): Promise<T> {
  const h: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (!noAuth) {
    const t = await SecureStore.getItemAsync("token");
    if (t) h["Authorization"] = `Bearer ${t}`;
  }
  const r = await fetch(`${API}${path}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || `HTTP ${r.status}`); }
  return r.json();
}

export const api = {
  get: <T>(p: string) => req<T>("GET", p),
  post: <T>(p: string, b?: any) => req<T>("POST", p, b),
  put: <T>(p: string, b?: any) => req<T>("PUT", p, b),
  del: <T>(p: string) => req<T>("DELETE", p),
};

export const auth = {
  register: (d: { email: string; username: string; password: string }) => req<{ user: User; token: string }>("POST", "/auth/register", d, true),
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
  create: (cid: string, d: { content: string; link_url?: string }) => api.post<{ post: Post }>(`/communities/${cid}/feed`, d),
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
