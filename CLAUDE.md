# CLAUDE.md — TrusCart

## Projektübersicht

TrusCart ist eine Community Commerce App (iOS + Android). Nutzer erstellen kostenlos Gruppen, teilen Produktlinks, chatten und entdecken Deals. Marken zahlen ein Abo für ihre Brandseite und können Sponsored Drops in Communities schalten.

**Kein eigener Shop.** Nutzer teilen Links zu externen Shops (Amazon, Zalando, etc.). Affiliate-Tags werden automatisch angehängt.

## Monorepo-Struktur

```
truscart/
├── app/                    ← React Native + Expo (Mobile App)
│   ├── app/                ← Expo Router Screens
│   ├── src/lib/api.ts      ← Typisierter API Client
│   ├── src/lib/store.ts    ← Zustand State (useAuth, useApp)
│   ├── src/components/     ← LinkEmbed, PostCard
│   └── CLAUDE.md           ← App-spezifischer Kontext
│
├── backend/                ← Laravel 11 API
│   ├── app/Http/Controllers/Api/   ← 8 Controller
│   ├── app/Services/               ← LinkPreview, Matomo, Revive, HumHub
│   ├── app/Models/                 ← 9 Models
│   ├── database/migrations/        ← Komplettes Schema
│   ├── routes/api.php              ← Alle Endpoints
│   └── CLAUDE.md                   ← Backend-spezifischer Kontext
│
└── CLAUDE.md               ← Diese Datei
```

## Geschäftsmodell

| Wer | Kosten | Features |
|-----|--------|----------|
| Enduser | Gratis | Communities, Feed, Chat, Links teilen |
| Brands | Abo (Starter €99, Pro €299, Enterprise €799/mo) | Brandseite, Sponsored Drops, Seeding, Analytics |
| TrusCart | — | Affiliate-Revenue auf alle geteilten Links |

## Tech Stack

| Layer | Tech |
|-------|------|
| Mobile App | React Native + Expo SDK 52, TypeScript |
| Routing | Expo Router v4 (file-based) |
| State | Zustand |
| Backend | Laravel 11, PHP 8.2+, Sanctum Auth |
| Database | MySQL |
| Hosting | Linevast Shared Hosting, app.truscart.com |

## Befehle

### App
```bash
cd app
npm install
npx expo start              # Dev mit Expo Go
eas build --platform ios     # Production Build
eas submit --platform ios    # App Store Submit
```

### Backend
```bash
cd backend
composer install
cp .env.example .env         # Credentials eintragen
php artisan key:generate
php artisan migrate --force
```

## Nächste Features (Priorität)

1. [ ] Bild-Upload für Posts
2. [ ] Profilseite + Avatar
3. [ ] Community-Settings (bearbeiten, Mitglieder verwalten)
4. [ ] Invite-Link teilen (Share Sheet)
5. [ ] Push Notifications
6. [ ] Kommentar-Ansicht
7. [ ] Suche
8. [ ] Onboarding (3 Slides beim ersten Start)
9. [ ] Brand-Tab
10. [ ] App Icon + Splash Screen

## Konventionen

- Deutsche UI-Texte, englischer Code
- UUID für alle IDs
- Dark Theme: BG `#0A0E1A`, Cards `#141926`, Accent `#00D4AA`
- Farben aus `app/src/constants/theme.ts` importieren
- StyleSheet.create statt Inline Styles
- API gibt JSON zurück, Fehler als `{message: "..."}`
