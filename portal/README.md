# Vouchmi Portal

Desktop-first Web-App für Brands, Creator und Community-Mitglieder. Läuft
path-koexistent zum Laravel-Backend unter derselben Domain `app.vouchmi.com`.

## Stack

- **Next.js 16** (App Router, Turbopack, Server Actions)
- **TypeScript strict** (`noUncheckedIndexedAccess`, `noImplicitOverride`)
- **Tailwind CSS 4** + shadcn/ui (radix-basiert)
- **TanStack Query v5** für Client-State, **Zustand** bei Bedarf
- **Zod** + `useActionState` für Formulare
- **next-themes** (Dark-First), **Recharts** für Charts
- **Sanctum Bearer-Token** in httpOnly-Cookie (kein Sanctum SPA — siehe CLAUDE.md)

## Setup

```bash
# vom Repo-Root
cd portal
pnpm install
cp .env.example .env.local
# BACKEND_URL auf dein lokales Laravel setzen (Default: http://localhost:8000)
pnpm dev
```

Parallel muss das Laravel-Backend laufen:

```bash
cd backend
php artisan serve   # http://localhost:8000
```

Next.js proxyt `/api/*`, `/sanctum/*` und `/storage/*` an `BACKEND_URL` — der Browser
sieht alles als same-origin. Im Dev zeigt `BACKEND_URL` auf `http://localhost:8000`,
in Produktion auf `https://api.vouchmi.com` (Laravel auf Mittwald).

Produktion läuft auf **Vercel** (`app.vouchmi.com`), nicht auf eigenem Server.
Siehe [DEPLOYMENT.md](../DEPLOYMENT.md) für den Rollout-Flow.

## Scripts

| Script            | Zweck                                            |
|-------------------|--------------------------------------------------|
| `pnpm dev`        | Dev-Server auf `http://localhost:3000`           |
| `pnpm build`      | Production-Build (Turbopack)                     |
| `pnpm start`      | Production-Server                                |
| `pnpm lint`       | ESLint (Next-Config)                             |
| `pnpm typecheck`  | `tsc --noEmit`                                   |

## ENV-Vars

| Variable                    | Zweck                                                 |
|-----------------------------|-------------------------------------------------------|
| `BACKEND_URL`               | Basis des Laravel-Backends für Server-seitige Aufrufe |
| `NEXT_PUBLIC_APP_URL`       | Public-Origin für OG-Tags                             |
| `NEXT_PUBLIC_USE_MOCKS`     | `true` = API-Mocks aktivieren (für Offline-Dev)       |

## Ordner-Struktur

```
portal/
├── app/
│   ├── (auth)/        # Login, Register, Reset, Verify
│   ├── (dashboard)/   # Role-gated: brand/, user/, influencer/
│   ├── (public)/      # SSR: /u/[username] (aka /@username), /c/[slug]
│   └── settings/      # Profil, Passwort, Notifications, Privacy
├── components/
│   ├── ui/            # shadcn primitives
│   ├── layout/        # Sidebar, TopNav, UserMenu, ThemeToggle
│   ├── dashboard/     # KpiCard, ReachChart, RecentDrops, EmptyState
│   └── forms/         # Form-Felder + SubmitButton
├── lib/
│   ├── api.ts         # Server-side fetch helper mit Bearer-Token
│   ├── session.ts     # httpOnly-Cookie-Handling
│   ├── schemas.ts     # Zod-Schemas für alle Forms
│   ├── queries/       # Typisierte Server-Fetches pro Domain
│   ├── types.ts       # API-Response-Types
│   └── utils.ts       # cn() + Format-Helpers
├── proxy.ts           # Next.js 16 Middleware (Auth-Guard)
└── next.config.ts     # Rewrites /api, /sanctum, /storage + /@user
```

## Testen

Claude Code hat in diesem Run **nicht** gegen ein laufendes Backend getestet. Vor dem
ersten Deploy gegen produktive Laravel-Instanz folgenden Flow manuell verifizieren:

1. Register mit neuer E-Mail → Redirect `/verify-email-pending`
2. Verify-Link aus E-Mail → zeigt aktuell auf `vouchmi://verify-email` (Mobile-Deep-Link,
   **Bug**, siehe BACKEND-TODO.md). Manuell `/verify-email?email=…&token=…` auf
   `http://localhost:3000` aufrufen
3. Login → Redirect `/brand`, `/user` oder `/influencer` je nach Rolle
4. Dashboard-Navigation testen, Sidebar-Links, Theme-Toggle
5. Logout via User-Menu → Session-Cookie weg, Redirect `/login`

## Weitere Dokumente

- [CLAUDE.md](./CLAUDE.md) — Architektur-Entscheidungen für künftige Claude-Code-Sessions
- [../BACKEND-TODO.md](../BACKEND-TODO.md) — Backend-Anpassungen
- [../DEPLOYMENT.md](../DEPLOYMENT.md) — Nginx + Rollout-Checkliste
