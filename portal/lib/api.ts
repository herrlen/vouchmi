import "server-only";
import { env } from "@/lib/env";
import { getSessionToken } from "@/lib/session";

export type ApiError = {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
};

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
  signal?: AbortSignal;
};

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const base = env.backendUrl.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${p}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const token = await getSessionToken();

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(buildUrl(path, opts.query), {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: opts.cache ?? (opts.method && opts.method !== "GET" ? "no-store" : undefined),
    next: opts.next,
    signal: opts.signal,
  });

  if (!response.ok) {
    let payload: { message?: string; errors?: Record<string, string[]> } = {};
    try {
      payload = (await response.json()) as typeof payload;
    } catch {
      /* empty body */
    }
    throw new ApiRequestError(
      response.status,
      payload.message ?? `Request failed with ${response.status}`,
      payload.errors,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function apiMaybe<T>(path: string, opts: RequestOptions = {}): Promise<T | null> {
  try {
    return await api<T>(path, opts);
  } catch (error) {
    // 401 = stale token, 403 = role/subscription gate (e.g. brand middleware
    // rejects users without an active brand subscription). Both represent
    // "no data to show" rather than a hard failure.
    if (error instanceof ApiRequestError && (error.status === 401 || error.status === 403)) {
      return null;
    }
    throw error;
  }
}
