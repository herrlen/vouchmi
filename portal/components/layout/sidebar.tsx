"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bookmark,
  Box,
  Compass,
  CreditCard,
  Gauge,
  Inbox,
  Megaphone,
  MessageSquare,
  Send,
  Settings,
  Sparkles,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const brandNav: NavItem[] = [
  { href: "/brand", label: "Übersicht", icon: Gauge },
  { href: "/brand/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/brand/campaigns", label: "Drops", icon: Megaphone },
  { href: "/brand/seeding", label: "Seeding", icon: Send },
  { href: "/brand/products", label: "Produkte", icon: Box },
  { href: "/brand/subscription", label: "Abo", icon: CreditCard },
];

const userNav: NavItem[] = [
  { href: "/user", label: "Feed", icon: Sparkles },
  { href: "/user/communities", label: "Communities", icon: Compass },
  { href: "/user/bookmarks", label: "Bookmarks", icon: Bookmark },
  { href: "/user/profile", label: "Profil", icon: User },
];

const influencerNav: NavItem[] = [
  { href: "/influencer", label: "Übersicht", icon: Gauge },
  { href: "/influencer/recommendations", label: "Empfehlungen", icon: MessageSquare },
  { href: "/influencer/stats", label: "Stats", icon: BarChart3 },
  { href: "/influencer/requests", label: "Anfragen", icon: Inbox },
  { href: "/influencer/profile", label: "Profil", icon: User },
];

const byRole: Record<UserRole, NavItem[]> = {
  brand: brandNav,
  user: userNav,
  influencer: influencerNav,
};

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = byRole[role];

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-sidebar py-6 md:block">
      <div className="px-6">
        <Link href="/" className="font-display text-2xl tracking-tight">
          Vouchmi
        </Link>
      </div>
      <nav className="mt-8 flex flex-col gap-0.5 px-3">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 border-t border-sidebar-border px-3 pt-6">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
            pathname.startsWith("/settings")
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:bg-sidebar-accent/60",
          )}
        >
          <Settings className="h-4 w-4" />
          Einstellungen
        </Link>
      </div>
    </aside>
  );
}
