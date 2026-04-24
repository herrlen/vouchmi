import type { UserRole } from "@/lib/types";

export function roleHome(role: UserRole): string {
  switch (role) {
    case "brand":
      return "/brand";
    case "influencer":
      return "/influencer";
    case "user":
    default:
      return "/user";
  }
}
