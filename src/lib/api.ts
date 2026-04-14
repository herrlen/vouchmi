// src/lib/api.ts
import * as SecureStore from "expo-secure-store";

const API = process.env.EXPO_PUBLIC_API_URL ?? "https://app.vouchmi.com/api";

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

export const users = {
  profile: (userId: string) => api.get<{ profile: User & { bio: string | null; link: string | null }; stats: { posts_count: number; followers_count: number; following_count: number }; is_following: boolean }>(`/users/${userId}/profile`),
  follow: (userId: string) => api.post<{ following: boolean; followers_count: number }>(`/users/${userId}/follow`),
  unfollow: (userId: string) => api.del<{ following: boolean; followers_count: number }>(`/users/${userId}/follow`),
};

export const profile = {
  get: () => api.get<{ profile: User & { bio: string | null; link: string | null }; stats: { communities_count: number; posts_count: number; followers_count: number; following_count: number } }>("/user/profile"),
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
  forgotPassword: (email: string) => req<{ message: string }>("POST", "/auth/forgot-password", { email }, true),
  resetPassword: (d: { email: string; token: string; password: string }) =>
    req<{ message: string }>("POST", "/auth/reset-password", d, true),
};

export const legal = {
  privacy: () => req<{ title: string; updated_at: string; content: string }>("GET", "/legal/privacy", undefined, true),
  terms:   () => req<{ title: string; updated_at: string; content: string }>("GET", "/legal/terms", undefined, true),
  imprint: () => req<{ title: string; updated_at: string; content: string }>("GET", "/legal/imprint", undefined, true),
};

export const communities = {
  mine: () => api.get<{ communities: Community[] }>("/communities"),
  discover: (sort: "followers" | "new" | "random" = "followers") =>
    api.get<{ communities: Community[] }>(`/communities/discover?sort=${sort}`),
  follow: (id: string) => api.post<{ following: boolean; follower_count: number }>(`/communities/${id}/follow`),
  unfollow: (id: string) => api.del<{ following: boolean; follower_count: number }>(`/communities/${id}/follow`),
  get: (id: string) => api.get<{ community: Community }>(`/communities/${id}`),
  create: (d: { name: string; description?: string; category?: string }) => api.post<{ community: Community }>("/communities", d),
  update: (id: string, d: { description?: string; category?: string; tags?: string[] }) =>
    api.put<{ community: Community }>(`/communities/${id}`, d),
  uploadImage: async (id: string, uri: string) => {
    const form = new FormData();
    const filename = uri.split("/").pop() || "community.jpg";
    const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
    const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    // @ts-expect-error RN FormData file
    form.append("image", { uri, name: filename, type });
    return req<{ image_url: string }>("POST", `/communities/${id}/image`, form);
  },
  destroy: (id: string) => req<{ message: string }>("DELETE", `/communities/${id}`),
  join: (id: string) => api.post(`/communities/${id}/join`),
  leave: (id: string) => api.post(`/communities/${id}/leave`),
  invite: (id: string) => api.post<{ invite_code: string; invite_link: string }>(`/communities/${id}/invite`),
  members: (id: string) => api.get<{ members: CommunityMember[] }>(`/communities/${id}/members`),
  setRole: (id: string, userId: string, role: "member" | "moderator") =>
    api.put<{ message: string }>(`/communities/${id}/members/${userId}/role`, { role }),
  muteUser: (id: string, userId: string, duration: "24h" | "7d" | "permanent") =>
    api.post<{ message: string; muted_until: string }>(`/communities/${id}/members/${userId}/mute`, { duration }),
  unmuteUser: (id: string, userId: string) =>
    api.del<{ message: string }>(`/communities/${id}/members/${userId}/mute`),
  kickUser: (id: string, userId: string) =>
    api.del<{ message: string }>(`/communities/${id}/members/${userId}`),
  hidePost: (id: string, postId: string) =>
    api.post<{ message: string }>(`/communities/${id}/posts/${postId}/hide`),
  deletePost: (id: string, postId: string) =>
    req<{ message: string }>("DELETE", `/communities/${id}/posts/${postId}`),
  muteStatus: (id: string) =>
    api.get<{ muted: boolean; muted_until: string | null }>(`/communities/${id}/mute-status`),
};

export const feed = {
  list: (cid: string, page = 1) => api.get<{ data: Post[]; last_page: number }>(`/communities/${cid}/feed?page=${page}`),
  all: (page = 1) => api.get<{ data: Post[]; last_page: number }>(`/feed?page=${page}`),
  top: (by: "likes" | "comments" | "shares" = "likes") => api.get<{ posts: Post[] }>(`/feed/top?by=${by}`),
  mine: (page = 1) => api.get<{ data: Post[]; last_page: number }>(`/user/posts?page=${page}`),
  create: (cid: string, d: { content?: string; link_url: string; link_title?: string; link_image?: string; link_price?: number }) =>
    api.post<{ post: Post }>(`/communities/${cid}/feed`, d),
  like: (pid: string) => api.post<{ like_count: number; liked: boolean }>(`/feed/${pid}/like`),
  comment: (pid: string, content: string, parent_id?: string) =>
    api.post<{ comment: Comment }>(`/feed/${pid}/comment`, { content, parent_id }),
  comments: (pid: string, sort: "foryou" | "newest" | "popular" = "foryou") =>
    api.get<{ comments: Comment[] }>(`/feed/${pid}/comments?sort=${sort}`),
  likeComment: (cid: string) =>
    api.post<{ liked: boolean; like_count: number }>(`/comments/${cid}/like`),
  repost: (pid: string, comment?: string) => api.post<{ reposted: boolean; repost_count: number }>(`/feed/${pid}/repost`, { comment }),
  unrepost: (pid: string) => api.del<{ reposted: boolean; repost_count: number }>(`/feed/${pid}/repost`),
  reposters: (pid: string) => api.get<{ reposters: User[] }>(`/feed/${pid}/reposters`),
  bookmark: (pid: string) => api.post<{ bookmarked: boolean }>(`/feed/${pid}/bookmark`),
  bookmarks: () => api.get<{ data: Post[] }>("/user/bookmarks"),
  myReposts: () => api.get<{ data: Post[] }>("/user/reposts"),
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

export type BrandStatus = {
  has_brand: boolean;
  is_active: boolean;
  paypal_status: string | null;
  brand: (Brand & { company_email?: string | null; paypal_status?: string | null; subscription_started_at?: string | null }) | null;
};

export const brand = {
  me: () => api.get<{ brand: Brand | null }>("/brand/me"),
  public: (slug: string) => api.get<{ brand: Brand }>(`/brands/${slug}`),
  status: () => api.get<BrandStatus>("/brand/status"),
  register: (d: { brand_name: string; company_email: string; website_url?: string; industry?: string; description?: string }) =>
    api.post<{ brand: Brand }>("/brand/register", d),
  subscribe: () => api.post<{ approval_url: string | null; subscription_id: string | null; configured: boolean }>("/brand/subscribe"),
  cancel: () => api.post<{ cancelled: boolean }>("/brand/cancel"),
};

export type Story = { id: string; community_id: string; media_url: string; media_type: "image" | "video"; duration: number | null; caption: string | null; view_count: number; expires_at: string | null; created_at: string; author: { id: string; username: string; display_name: string; avatar_url: string | null } };

export const stories = {
  feed: () => api.get<{ stories: Story[] }>("/stories"),
  mine: (page = 1) => api.get<{ data: Story[] }>(`/user/stories?page=${page}`),
  list: (cid: string) => api.get<{ data: Story[] }>(`/communities/${cid}/stories`),
  create: async (cid: string, uri: string, mediaType: "image" | "video", caption?: string, duration?: number) => {
    const form = new FormData();
    const filename = uri.split("/").pop() || (mediaType === "video" ? "story.mp4" : "story.jpg");
    const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
    const type = mediaType === "video" ? (ext === "mov" ? "video/quicktime" : "video/mp4") : (ext === "png" ? "image/png" : "image/jpeg");
    // @ts-expect-error RN FormData file
    form.append("media", { uri, name: filename, type });
    if (caption) form.append("caption", caption);
    if (duration) form.append("duration", String(Math.round(duration)));
    return req<{ story: Story }>("POST", `/communities/${cid}/stories`, form);
  },
  destroy: (id: string) => req<{ message: string }>("DELETE", `/stories/${id}`),
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
export type Community = { id: string; name: string; slug: string; description: string | null; image_url: string | null; category: string | null; tags?: string[] | null; member_count: number; follower_count?: number; is_followed?: boolean; is_private: boolean; role?: string; is_member?: boolean; my_role?: string; owner_id?: string };
export type CommunityMember = { id: string; username: string; display_name: string | null; avatar_url: string | null; role: string; muted_until?: string | null };
export type Post = { id: string; community_id: string; content: string; post_type: string; link_url: string | null; link_affiliate_url: string | null; link_title: string | null; link_image: string | null; link_price: number | null; link_domain: string | null; like_count: number; comment_count: number; repost_count: number; click_count: number; is_liked?: boolean; is_reposted?: boolean; is_bookmarked?: boolean; created_at: string; author: { id: string; username: string; display_name: string; avatar_url: string | null } };
export type Comment = { id: string; content: string; created_at: string; parent_id?: string | null; like_count?: number; is_liked?: boolean; replies?: Comment[]; author: { id: string; username: string; display_name: string; avatar_url: string | null } };
export type Msg = { id: string; content: string; link_url: string | null; link_title: string | null; link_image: string | null; link_price: number | null; created_at: string; sender: { id: string; username: string; display_name: string; avatar_url: string | null } };
export type LinkPreview = { original_url: string; affiliate_url: string; title: string | null; description: string | null; image: string | null; price: number | null; domain: string };
export type Drop = { id: string; title: string; description: string | null; product_url: string | null; discount_code: string | null; discount_percent: number | null; image_url: string | null; votes_yes: number; votes_no: number; status: string };
