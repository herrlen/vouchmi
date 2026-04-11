# CLAUDE.md — TrusCart Projektkontext

## Was ist TrusCart?

TrusCart ist eine Community Commerce App (iOS + Android). Nutzer erstellen Gruppen, teilen Produktlinks, chatten und entdecken Deals. Die App ist KEIN Shop — sie ist eine Social-Plattform auf der Links zu externen Shops geteilt werden (Amazon, Zalando, etc.). Affiliate-Tags werden automatisch angehängt.

## Geschäftsmodell

- **Enduser:** Komplett kostenlos. Communities erstellen, beitreten, posten, chatten.
- **Brands/Marken:** Bezahltes Abo für Brandseite, Sponsored Drops, Product Seeding, Analytics.
- **Affiliate:** Jeder geteilte Produktlink bekommt automatisch einen Affiliate-Tag (Amazon PartnerNet, Awin).

## Tech Stack

### App (dieses Repo)
- **Framework:** React Native + Expo (SDK 52)
- **Routing:** Expo Router v4 (file-based)
- **State:** Zustand
- **Language:** TypeScript
- **Auth:** Token-basiert via SecureStore

### Backend (separates Repo: truscart-backend)
- **Framework:** Laravel 11 (PHP 8.2+)
- **Auth:** Laravel Sanctum (Bearer Tokens)
- **Database:** MySQL
- **Hosting:** Linevast Shared Hosting
- **URL:** https://app.truscart.com/api

## App-Architektur

```
app/                          ← Expo Router Screens
├── _layout.tsx               ← Root Layout, Auth Init
├── index.tsx                 ← Home: Community-Liste
├── auth.tsx                  ← Login / Registrierung
├── create-community.tsx      ← Community erstellen
├── discover.tsx              ← Öffentliche Communities entdecken
└── community/
    └── [id].tsx              ← Community Detail (Feed + Chat + Drops Tabs)

src/
├── lib/
│   ├── api.ts                ← Typisierter API Client (alle Endpoints)
│   └── store.ts              ← Zustand Stores (useAuth, useApp)
├── components/
│   ├── LinkEmbed.tsx         ← Produkt-Link Preview Card
│   └── PostCard.tsx          ← Feed Post mit Engagement
└── constants/
    └── theme.ts              ← Farben (Dark Theme)
```

## Design

- Dark Theme: Background `#0A0E1A`, Cards `#141926`, Accent `#00D4AA`
- Abgerundete Cards (14-16px border-radius)
- Minimal, kein Overdesign

## API Endpoints (Backend)

### Auth
- POST `/auth/register` — {email, username, password} → {user, token}
- POST `/auth/login` — {email, password} → {user, token}
- POST `/auth/logout`
- GET `/auth/me` → {user}

### Communities
- GET `/communities` — Meine Communities
- GET `/communities/discover` — Öffentliche
- POST `/communities` — {name, description?, category?}
- POST `/communities/{id}/join`
- POST `/communities/{id}/leave`
- POST `/communities/{id}/invite` → {invite_code, invite_link}

### Feed
- GET `/communities/{id}/feed?page=1` — Paginierte Posts
- POST `/communities/{id}/feed` — {content, link_url?}
- POST `/feed/{id}/like` → {like_count, liked}
- POST `/feed/{id}/comment` — {content}

### Chat
- GET `/communities/{id}/messages?after=ISO_DATE`
- POST `/communities/{id}/messages` — {content, link_url?}

### Link Preview
- GET `/link-preview?url=ENCODED_URL` → {preview: {title, image, price, domain, affiliate_url}}
- POST `/track/click` — {post_id, community_id, original_url, affiliate_url}

### Sponsored Drops
- GET `/communities/{id}/drops`
- POST `/drops/{id}/vote` — {vote: true/false}

### Brand API (auth + brand middleware)
- GET `/brand/profile`
- PUT `/brand/profile`
- POST `/brand/drops` — Sponsored Drop erstellen
- GET `/brand/analytics/mentions`
- GET `/brand/analytics/clicks`

## Noch zu bauen (Priorität)

### App — Nächste Features
1. [ ] Bild-Upload für Posts (expo-image-picker + Supabase Storage oder Laravel Storage)
2. [ ] Pull-to-refresh auf allen Listen
3. [ ] Profilseite (eigenes Profil bearbeiten, Avatar)
4. [ ] Community-Settings (Name/Beschreibung ändern, Mitglieder verwalten)
5. [ ] Invite-Link teilen (Share Sheet)
6. [ ] Push Notifications (expo-notifications)
7. [ ] Kommentar-Ansicht unter Posts
8. [ ] Suche (Communities + Posts)
9. [ ] Onboarding Screens (3 Slides beim ersten Start)
10. [ ] Brand-Tab (falls user.role === "brand")

### Backend — Noch nicht deployt
- Laravel Projekt auf app.truscart.com deployen
- Migration ausführen
- .env mit echten Credentials füllen

### Vor App Store
- App Icon (1024x1024) und Splash Screen erstellen
- Screenshots für App Store (6.7" + 6.1")
- Privacy Policy + Terms of Service auf truscart.com
- Apple Developer Account (99€/Jahr)
- EAS Build konfigurieren

## Konventionen

- Deutsche UI-Texte, englischer Code
- UUID für alle IDs
- API gibt immer JSON zurück
- Fehler als {message: "..."} mit passendem HTTP Status
- Keine Inline Styles wo möglich — StyleSheet.create nutzen
- Farben immer aus theme.ts importieren

## Befehle

```bash
npm install          # Abhängigkeiten installieren
npx expo start       # Dev Server starten (QR Code für Expo Go)
eas build --platform ios    # iOS Build (für App Store)
eas build --platform android # Android Build
eas submit --platform ios   # An Apple senden
```

## Owner

- Plattform: Linevast Shared Hosting (Deutschland)
- Domain: truscart.com
- Backend: app.truscart.com
