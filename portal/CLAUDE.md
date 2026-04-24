@AGENTS.md

# Vouchmi Portal — Architektur-Entscheidungen

Diese Datei dokumentiert *warum* das Portal so aufgebaut ist. Für Setup/Scripts
siehe [README.md](./README.md). Für Backend-Änderungen siehe `../BACKEND-TODO.md`.

## Entscheidende Weichenstellungen

### 1. Vercel + Mittwald, logisch same-origin
- Produktion: `app.vouchmi.com` zeigt DNS-mäßig auf **Vercel** (Portal, Next.js).
  Laravel liegt weiterhin auf Mittwald und ist unter **`api.vouchmi.com`** erreichbar.
- Next.js-Rewrites in `next.config.ts` forwarden `/api/*`, `/sanctum/*`, `/storage/*`
  serverseitig zu `BACKEND_URL` (= `https://api.vouchmi.com` in Prod).
- Aus Browser-Sicht same-origin (alles `app.vouchmi.com`) → kein CORS.
- Server Components + Server Actions rufen `BACKEND_URL` direkt auf (Node-zu-Node).
- Mobile-App redet direkt mit `api.vouchmi.com` (keine Umleitung via Vercel).
- Hintergrund: Mittwald Webhosting kann kein Node.js, daher diese hybride Lösung
  statt Nginx-Path-Routing auf einem Server.

### 2. Bearer-Token in httpOnly-Cookie statt Sanctum-SPA-Session
- Das Backend (`app/Http/Controllers/Api/AuthController.php`) gibt bei `login`/`register`
  `{ user, token }` zurück — reines Bearer-Token-Modell für Mobile.
- Statt das invasiv auf Sanctum-Session-Auth umzubauen, speichern wir den Token
  in einem **httpOnly-Cookie** (`vouchmi_session`, Set über `lib/session.ts`).
- `lib/api.ts` liest den Cookie serverseitig und hängt ihn als `Authorization: Bearer ...`
  an jeden Request ans Backend.
- Mobile-App-Contract bleibt 1:1 unberührt. Kein CORS nötig (same-origin).

### 3. Next.js 16 (nicht 15) — Breaking Changes beachten
Das Scaffold hat Next.js 16.2.4 installiert. Relevante Unterschiede zu 15:
- Middleware heißt jetzt `proxy.ts` mit `export function proxy()` (siehe `portal/proxy.ts`).
- `cookies()`, `headers()`, `params`, `searchParams` sind **async** — immer awaiten.
- Turbopack ist Default für `dev` + `build`.
- Server Actions + `useActionState` sind das empfohlene Form-Pattern
  (statt Route Handler + axios client-side).

### 4. Server Actions für Forms, fetch() für Queries
- Jede Auth-Form hat `actions.ts` mit `"use server"` + `useActionState` im Client.
- Dashboard-Reads laufen über Server Components mit `api()` aus `lib/api.ts`.
- TanStack Query ist installiert, wird aber aktuell nur client-seitig für
  live-reaktive Views vorbereitet.

### 5. Role-Gate statt Middleware-Role-Check
- `proxy.ts` macht nur die Auth-Check (Cookie vorhanden? → sonst Redirect `/login`).
- **Role-Check** passiert im Dashboard-Layout via `requireRole(...)` (siehe
  `app/(dashboard)/role-guard.ts`). Grund: Der Token-Wert im Cookie sagt nichts
  über die Rolle; ein Netzwerk-Call an `/api/auth/me` ist ohnehin nötig.
- Vorteil: Ein Brand-User kann `/user/...` nicht einfach umgehen, weil der Layout
  `requireRole` den Redirect macht.

## Wenn du `web/` scaffolden willst — NICHT HIER

`web/` (Top-Level im Repo) ist die **Linevast-Marketing-Site für vouchmi.com**
(reines HTML/CSS/PHP). Das Portal liegt in `portal/`. Marketing-Site nicht anfassen.

## Phase-2-Backlog (nicht bauen, nur merken)

- Brand-Team / Multi-User-Workspaces — benötigt Backend-Migration
  (`team_members`, `invitations`, `role_policies`). `/brand/team` ist **bewusst
  weggelassen** in Phase 1.
- Live-Chat Brand ↔ Influencer
- AB-Testing für Drops
- Affiliate-Link-Shortener mit eigener Domain
- Web-Push
- OAuth (Apple, Google) Login

## Pragmatische Abweichungen vom ursprünglichen Prompt

- **Axios** ist installiert, aber wird nicht verwendet (native `fetch()` reicht).
  Kann später entfernt werden.
- **next-intl** ist installiert, aber noch nicht verdrahtet. Alle UI-Strings sind
  aktuell hardcoded auf Deutsch. `messages/de.json` + `messages/en.json` fehlen
  noch — später mit next-intl integrieren.
- **CommandPalette (⌘K)** ist im Design-Spec enthalten, aber noch nicht gebaut
  (Sidebar reicht für Phase 1). Folge-Session.

## Bekannte Limits bei diesem ersten Build

- Laravel-Backend ist beim Build **nicht gelaufen** → Live-Integration ist noch
  nicht smoketestet.
- User-Profile lookup erwartet `/api/users/by-username/:username` — existiert
  im Backend noch nicht (es gibt nur `/api/users/{userId}/profile`). Fix in
  `../BACKEND-TODO.md`.
- Community-Slug-Lookup (`/api/communities/by-slug/:slug`) analog.
- Brand-Overview aggregiert aus 3 Einzel-Endpoints (`/drops`, `/analytics/clicks`,
  `/analytics/mentions`). Ein konsolidierter Endpoint wäre effizienter.
- Verify-Email-Mail zeigt aktuell auf `vouchmi://…` (Mobile Deep-Link), Web-User
  kann das nicht öffnen. Muss im Backend Web-aware gemacht werden.

## Konventionen

- Komponenten in `components/ui/` sind shadcn-Originale, nicht anfassen außer
  für Farb-Themes (Tokens in `globals.css`).
- Server Components sind Default. Client Components nur wenn `useState`/`useEffect`
  oder Event-Handler nötig (`"use client"` oben).
- Keine Emojis in UI-Strings. Icons aus `lucide-react`.
- Jede Server Action validiert mit Zod-Schema aus `lib/schemas.ts`, bevor sie
  ans Backend geht.
- Fehler-UI: `FormFieldError` für Felder, `role="alert"` Div für Form-Level-Fehler.
- Error-Messages auf Deutsch, nutzerfreundlich („Diese E-Mail-Adresse kennen wir
  nicht" statt „404 — user not found").
