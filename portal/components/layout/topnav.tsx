import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import type { AuthUser } from "@/lib/types";

export function TopNav({ user }: { user: AuthUser }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="hidden md:inline">Portal</span>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
