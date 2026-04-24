# Backend-TODO für das Portal (Vouchmi Web-App)

Liste aller Backend-Anpassungen, die für das neue `portal/` (Next.js) nötig sind.
Stand: erster Scaffold-Run. Alles was hier steht, hat Claude Code **nicht**
selbst gebaut — es ist entweder eine Konfig, ein fehlender Endpoint, oder ein
Mini-Branch im bestehenden Code.

## Ampel

- 🟥 Blocker — Portal funktioniert sonst nicht
- 🟨 Empfohlen — Portal läuft ohne, aber Feature X ist leer
- 🟩 Nice-to-have — Optimierung

---

## 🟥 Auth

### E-Mail-Verify-Link ist Mobile-Only
`backend/app/Http/Controllers/Api/AuthController.php` Zeile 122:

```php
$verifyUrl = 'vouchmi://verify-email'
    . '?token=' . urlencode($plainToken)
    . '&email=' . urlencode($user->email);
```

Ein Web-User, der sich im Portal registriert, bekommt diesen Mobile-Deep-Link
per E-Mail — kann ihn aber nicht öffnen.

**Fix-Varianten:**

**A (einfach, empfohlen)**: Registration-Source im User-Table vermerken (`source`:
`mobile`/`web`), Link je nach Quelle wählen.

**B (pragmatisch)**: Beide Links in der Mail rendern ("In der App öffnen" +
"Im Web öffnen"). Backend weiß dann nicht, woher der User kam.

**C**: Smart-Link `https://app.vouchmi.com/verify-email?...` — auf dem Gerät
checkt der Server den User-Agent und redirectet ggf. in die App. Komplex.

Empfehlung: **A**.

---

## 🟥 Hostname-Split: `api.vouchmi.com` einrichten

Portal liegt ab Rollout auf Vercel unter `app.vouchmi.com`. Laravel zieht
technisch auf `api.vouchmi.com` um (zweiter Hostname, gleiches DocumentRoot).
Details: siehe `DEPLOYMENT.md`.

### Laravel `.env` anpassen (auf Mittwald)

```env
APP_URL=https://app.vouchmi.com         # bleibt Portal-URL (Reset-Password-Link)
SANCTUM_STATEFUL_DOMAINS=app.vouchmi.com
SESSION_SECURE_COOKIE=true
```

Nach Änderung `php artisan config:clear` ausführen.

Das Portal selbst nutzt Bearer-Token in httpOnly-Cookie, kein Sanctum-SPA.
Die `SANCTUM_STATEFUL_DOMAINS`-Einstellung ist für spätere SPA-Nutzung
vorbereitet, aktuell nicht blockierend.

---

## 🟨 User-/Community-Lookup per Slug/Username

Das Portal verlinkt öffentliche Profile als `/@username` und Communities als
`/c/:slug`. Das Backend hat aktuell aber nur ID-basierte Lookups:

- `GET /api/users/{userId}/profile` — braucht eine User-ID
- `GET /api/brands/{id}/profile` — braucht eine Brand-ID
- `GET /api/communities/{id}` — braucht eine Community-ID

**Benötigt:**

```
GET /api/users/by-username/{username}
  → Gibt User-Public-Profile zurück (gleicher Response wie /api/users/{userId}/profile)

GET /api/communities/by-slug/{slug}
  → Gibt Community-Public-View zurück (gleicher Response wie /api/communities/{id})
```

**Public Profile Response erwartet** (siehe `portal/lib/queries/public.ts`):

```ts
{
  id, username, display_name, avatar_url, bio, role,
  followers_count, following_count
}
```

---

## 🟨 Brand-Overview-Aggregat

Aktuell ruft `lib/queries/brand.ts` drei Endpoints parallel:

- `/api/brand/drops`
- `/api/brand/analytics/clicks`
- `/api/brand/analytics/mentions`

**Erwartetes Response-Format von `/api/brand/analytics/clicks`:**

```json
{
  "total": 12345,
  "series": [
    { "date": "2026-04-17", "reach": 420 },
    { "date": "2026-04-18", "reach": 512 }
  ]
}
```

Falls der Endpoint aktuell ein anderes Format liefert, entweder Endpoint anpassen
oder im Portal-Query parsen.

**Optimierung:** Ein gemeinsamer Endpoint `GET /api/brand/overview` würde die
3 Requests einsparen.

---

## 🟨 Passwort-Änderung für eingeloggte User

Das Portal zeigt unter `/settings/password` ein Formular mit `current_password`,
`new_password`, `new_password_confirmation`. Der Endpoint dafür existiert noch
nicht.

**Benötigt:**

```
POST /api/user/password
  Body: { current_password, new_password, new_password_confirmation }
  Auth: auth:sanctum
  Response: 204 oder { message }
```

---

## 🟨 Benachrichtigungs-Präferenzen

Seite `/settings/notifications` zeigt Toggle-Switches für E-Mail-Präferenzen
(Brand-Anfragen, Community-Aktivität). Aktuell keine Speichermöglichkeit.

**Benötigt:**

```
GET /api/user/notification-preferences
POST /api/user/notification-preferences
  Body: { brand_requests: bool, community_digest: bool }
```

---

## 🟨 Daten-Export (DSGVO)

Seite `/settings/privacy` hat „Export anfordern"-Button.

**Benötigt:**

```
POST /api/user/export
  → Triggert asynchronen Job, User bekommt per E-Mail Download-Link
  Response: 202 Accepted
```

---

## 🟨 Brand-Team (Phase 2 — JETZT NICHT BAUEN)

Das Portal hat **bewusst kein** `/brand/team`. Der Grund: Das Backend hat kein
`team_members`-Schema. Wenn dieses Feature später kommt, ist das eine Migration +
Model + Policies + Invite-Flow — nicht trivial. Backlog.

---

## 🟨 Brand-Produktkatalog

`/brand/products` zeigt einen leeren Empty-State. Backend-Endpoints für
Brand-Produkte sind nicht im aktuellen `routes/api.php`. Falls das als Feature
gewünscht ist, neu entwerfen:

```
GET    /api/brand/products
POST   /api/brand/products
PUT    /api/brand/products/{id}
DELETE /api/brand/products/{id}
```

---

## 🟩 Influencer-Requests-Inbox (Phase 2-Feature)

`/influencer/requests` braucht einen Brand-Outreach-Endpoint. Aktuell nicht im
Backend.

```
GET /api/influencer/requests
POST /api/influencer/requests/{id}/accept
POST /api/influencer/requests/{id}/decline
```

---

## 🟩 Post-Repost-Log / Seeding-Requests-Log

Brand-Seeding-Page braucht eine History der versendeten Outreach-Anfragen.
Kommt aus `/api/brand/seeding/*`, das bereits existiert aber möglicherweise
noch kein Status-Log hat.

---

## Deployment-Anpassungen (siehe DEPLOYMENT.md)

- Nginx auf app.vouchmi.com: Laravel behält `/api`, `/sanctum`, `/storage`,
  `/admin`, `/broadcasting`. Alles andere geht an Next.js (Node-Prozess).
- `APP_URL` in Laravel-`.env` sollte weiterhin `https://app.vouchmi.com` sein
  (wird in `forgotPassword` für den Reset-Link genutzt — landet korrekt auf
  dem Next-Portal).
