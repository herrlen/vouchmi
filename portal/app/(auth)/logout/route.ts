import { NextResponse } from "next/server";
import { api } from "@/lib/api";
import { clearSessionToken } from "@/lib/session";

export async function POST(request: Request) {
  try {
    await api<{ message: string }>("/api/auth/logout", { method: "POST" });
  } catch {
    // ignore — we clear the cookie regardless
  }
  await clearSessionToken();
  return NextResponse.redirect(new URL("/login", request.url));
}
