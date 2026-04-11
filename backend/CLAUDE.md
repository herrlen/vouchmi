# CLAUDE.md — TrusCart Backend

## Was ist das?

Laravel 11 API Backend für die TrusCart Community Commerce App. Läuft auf app.truscart.com (Linevast Shared Hosting).

## Tech

- Laravel 11, PHP 8.2+, MySQL, Sanctum Auth
- Shared Hosting: kein Redis, kein WebSocket, kein Queue Worker
- CACHE_DRIVER=file, QUEUE_CONNECTION=sync, BROADCAST_DRIVER=log

## Architektur

```
app/Http/Controllers/Api/
├── AuthController.php              # Register, Login, Logout, Me
├── CommunityController.php         # CRUD, Join, Leave, Invite
├── FeedController.php              # Posts mit Link-Previews, Likes, Comments
├── ChatController.php              # Messages + Polling
├── LinkPreviewController.php       # OG-Tag Extraction + Affiliate Tags
├── BrandController.php             # Brand-Profil, Analytics, Seeding (nur zahlende Marken)
├── SponsoredDropController.php     # Drops + Community Voting
└── UserController.php              # Profil, Event Tracking

app/Services/
├── LinkPreviewService.php          # Fetcht URL → extrahiert Titel/Bild/Preis → hängt Affiliate-Tag an
├── HumHubService.php               # OPTIONAL: Bridge zu HumHub REST API
├── ReviveAdService.php             # Revive Adserver für Sponsored Drops
└── MatomoService.php               # Event + E-Commerce Tracking

app/Models/
├── User.php, Community.php, Post.php, Comment.php, Message.php
├── BrandProfile.php, SponsoredDrop.php, SeedingCampaign.php, Invite.php
```

## Geschäftsmodell im Code

- User: komplett kostenlos, keine Einschränkungen
- Brands: `role=brand` + aktives Abo (BrandMiddleware prüft subscription_expires_at)
- Affiliate: LinkPreviewService hängt automatisch Tags an (Amazon PartnerNet, Awin)
- link_clicks Tabelle trackt jeden Klick für Affiliate-Revenue Reporting

## Deploy

```bash
composer install --no-dev --optimize-autoloader
cp .env.example .env  # Credentials eintragen
php artisan key:generate
php artisan migrate --force
php artisan config:cache
php artisan route:cache
chmod -R 775 storage/ bootstrap/cache/
```

Document Root muss auf /public zeigen.

## Konventionen

- UUID für alle Model IDs (HasUuids Trait)
- API gibt immer JSON zurück
- Deutsche Fehlermeldungen für User-facing Errors
- Alle Tabellen ohne Prefix (kein hive_ mehr)
