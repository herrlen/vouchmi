# Release Playbook — Credits & Boost Pivot

> Schritt-für-Schritt für den iOS-Launch. Geschätzte Dauer **4 Tage** vom ersten
> Klick bis Apple-Review-Submission. Du brauchst Zugang zu: App Store Connect,
> Apple Developer Portal, PayPal Dashboard, dem Vouchmi-Backend-Server (SSH),
> und einem Mac mit Xcode-CommandLine-Tools.

---

## Tag 1 — Apple-Setup (browser-basiert, ~90 min)

### Schritt 1: Test-Account in der Vouchmi-App anlegen (10 min)

Apple-Reviewer brauchen ein Konto, mit dem sie die App durchklicken können.

1. Öffne **app.vouchmi.com/register** oder die Mobile-App, registriere ein neues Konto:
   - E-Mail: `review@vouchmi.com` (auf der Domain ein Postfach anlegen, falls
     noch nicht existent)
   - Passwort: ein zufälliges 16-stelliges (Passwort-Generator)
   - Username: `apple_review`
   - Display-Name: `Apple Review`
2. Verifiziere die E-Mail.
3. Mache **2 Test-Empfehlungen** im Feed — beliebige Produkte, damit
   der Reviewer beim Boost-Walkthrough was zum Boosten hat.
4. **Promote dich selbst zum Influencer**: ändere in der DB direkt
   ```sql
   UPDATE users SET role='influencer' WHERE email='review@vouchmi.com';
   ```
   (Das geht aktuell nicht über die App — bis Sprint 8 live ist, brauchen
   Influencer einen aktiven Abo-Status, oder eben Manuell-Promotion.)

### Schritt 2: Test-Account-Credentials in Review Notes eintragen (2 min)

1. Öffne [APPLE_REVIEW_NOTES.md](APPLE_REVIEW_NOTES.md) im Repo.
2. Ersetze `<hier-im-App-Store-Connect-eintragen>` durch das Passwort aus Schritt 1.
3. **Nicht** ins Git committen mit dem echten Passwort drin — wir tragen das
   später nur ins App-Store-Connect-Formular ein. Wenn du die Datei pflegen
   willst, lass den Platzhalter stehen und kopiere das Passwort separat.

### Schritt 3: Vier Consumable-IAPs in App Store Connect anlegen (45 min)

URL: **appstoreconnect.apple.com** → My Apps → Vouchmi → In-App Purchases →
Manage → ⊕ Create.

Für jedes der vier Produkte den gleichen Ablauf:

| # | Product ID | Reference Name | Apple Tier (DE/EUR) |
|---|---|---|---|
| 1 | `com.vouchmi.credits.500`   | 500 Vouchmi Credits   | **Tier 5** (4,99 €) |
| 2 | `com.vouchmi.credits.1500.v2`  | 1500 Vouchmi Credits  | **12,99 €** (kein 13,99-Tier in EUR) |
| 3 | `com.vouchmi.credits.5000`  | 5000 Vouchmi Credits  | **Tier 39** (39,99 €) |
| 4 | `com.vouchmi.credits.15000` | 15000 Vouchmi Credits | **Tier 99** (99,99 €) |

Pro Produkt ausfüllen:

- **Type**: Consumable
- **Reference Name**: aus Tabelle (intern)
- **Product ID**: aus Tabelle (**muss exakt** so heißen — Backend mappt darauf)
- **Cleared for Sale**: ✅
- **Price Schedule**: Apple-Tier aus Tabelle, *Germany* + alle gewünschten
  Storefronts auswählen
- **App Store Localization** (mind. Deutsch + Englisch):
  - Display Name DE: z.B. `500 Vouchmi Credits`
  - Description DE: `Lade dein Vouchmi-Wallet mit 500 Credits auf, um Empfehlungen zu bewerben.`
  - Display Name EN: `500 Vouchmi Credits`
  - Description EN: `Top up your Vouchmi wallet with 500 credits to boost your recommendations.`
- **Review Screenshot**: pro Produkt ein Screenshot des Wallet-Screens mit
  sichtbarem Topup-Button. Du kannst denselben Screenshot 4× hochladen.
- **Review Notes** (pro Produkt): `Consumable credits for promoting own recommendations within the app. See main app review notes for full flow.`

Nach dem Speichern: jeder Eintrag soll im Status **„Ready to Submit"** stehen.
Falls einer auf „Missing Metadata" hängt → meistens fehlt der Screenshot.

### Schritt 4: Sandbox-Tester anlegen (5 min)

URL: **appstoreconnect.apple.com** → Users and Access → Sandbox → Testers →
⊕ Add Tester.

- First/Last Name: irgendwas
- E-Mail: eine echte E-Mail, die du **nirgendwo sonst als Apple-ID** benutzt
  (z.B. `vouchmi-sandbox+test1@deine-domain.com`)
- Passwort: notieren!
- Country/Region: Germany

Diese Daten brauchst du auf dem Testgerät unter Settings → App Store → Sandbox
Account, sobald die TestFlight-App das erste Mal einen Kauf anstößt.

### Schritt 5: PayPal-Webhook für Wallet-Topups einrichten (15 min)

Parallel zur Apple-Arbeit, weil PayPal nicht reviewt.

URL: **developer.paypal.com** → Apps & Credentials → wähle dein Live-App →
Webhooks → Add Webhook.

- **Webhook URL**: `https://api.vouchmi.com/api/v1/webhooks/paypal/wallet`
- **Event Types** anhaken:
  - `Payment capture completed`
  - `Payment capture denied`
  - `Payment capture reversed`
  - `Payment capture refunded`
  - `Customer dispute created`

Speichern → die generierte **Webhook ID** kopieren. Diese landet im Backend-`.env`
falls sie sich vom bestehenden unterscheidet (sonst kannst du den selben Wert wie
bisher belassen, beide Endpoints prüfen gegen denselben Webhook).

Verifiziere mit `php artisan vouchmi:paypal:health` auf dem Server, dass der
neue Webhook erkannt wird.

---

## Tag 2 — Staging-Deployment & Sandbox-Tests (~2h)

### Schritt 6: Staging-Backend mit Credits aktivieren (15 min)

SSH auf den Staging-Server:

```bash
cd /pfad/zum/backend

# .env editieren:
echo 'CREDITS_ENABLED=true' >> .env
echo 'CREDITS_SUBSCRIPTIONS_SUNSET=false' >> .env  # noch nicht aktivieren
echo 'CREDITS_MONITORING_TOKEN='$(openssl rand -hex 32) >> .env
echo 'CREDITS_ADMIN_TOKEN='$(openssl rand -hex 32) >> .env

# Migrations gegen Staging laufen:
php artisan migrate --force

# Config-Cache neu bauen:
php artisan config:cache
php artisan route:cache

# Scheduler triggern lassen (Boost-Expire alle 5 min):
php artisan schedule:list
```

Notiere dir beide Tokens — du brauchst sie für Schritt 9 (Grafana) und für
Admin-Calls aus dem Runbook.

### Schritt 7: iOS Development-Build erzeugen (30 min)

Auf deinem Mac:

```bash
cd /Users/len/Desktop/vouchmi

# Falls noch nicht installiert:
npm install -g eas-cli
eas login

# Sicherstellen, dass die App auf Staging zeigt:
echo 'EXPO_PUBLIC_API_URL=https://staging-api.vouchmi.com/api' > .env.staging

# Internes Build für Sandbox-Tests (geht direkt aufs Gerät):
eas build --profile preview --platform ios
```

EAS fragt eventuell nach App Store Connect Login (zum Provisioning). Build
dauert ~15 min. Am Ende kriegst du einen `.ipa`-Link → in Safari auf dem
iPhone öffnen → installiert sich.

### Schritt 8: Sandbox-IAP-Test durchspielen (45 min)

Auf dem iPhone:

1. Settings → App Store → Sandbox Account → mit dem in Schritt 4 angelegten
   Tester einloggen.
2. Vouchmi öffnen, mit `review@vouchmi.com` einloggen (oder einem
   Test-Influencer-Account).
3. Profil → Settings → **Wallet & Credits**.
4. Auf das kleinste Paket (500 Credits / 4,99 €) tippen → StoreKit-Sheet
   öffnet sich → mit Sandbox-Account bestätigen → „Aufgeladen, 500 Credits
   gutgeschrieben" Alert.
5. Wallet zeigt jetzt 500 Credits. Verifiziere im Backend:
   ```sql
   SELECT * FROM wallet_transactions
   WHERE payment_provider='apple_iap'
   ORDER BY created_at DESC LIMIT 5;
   ```
6. **Boost-Test**: Geh in den Feed, finde eine eigene Empfehlung → Drei-Punkte →
   „Empfehlung bewerben" → Mini-Boost (50 Credits) → bestätigen → „Beworben"-Badge
   erscheint auf der Card.
7. **Refund-Test**: Auf dem iPhone Settings → App Store → Sandbox Account →
   Refund Apple Sandbox-Käufe (Apple bietet hier in den Settings-Menüs einen
   Refund-Trigger für Sandbox an). Backend bekommt `REFUND`-Notification,
   Credits werden auf 0 zurückgesetzt.

Wenn alle drei Schritte (Buy + Boost + Refund) sauber laufen → grünes Licht für
TestFlight-Build.

---

## Tag 3 — TestFlight & interne Tester (~3h)

### Schritt 9: Production-Build für TestFlight (30 min)

```bash
cd /Users/len/Desktop/vouchmi

# Production-API in .env setzen (NICHT Staging):
echo 'EXPO_PUBLIC_API_URL=https://api.vouchmi.com/api' > .env.production

# Vor dem Build: app.config.ts version checken (steht jetzt auf 1.0.0,
# Build-Number wird per autoIncrement hochgezählt — keine Aktion nötig).

eas build --profile production --platform ios
```

Build dauert ~15 min. Nach Erfolg automatisch:

```bash
eas submit --platform ios --latest
```

Lädt nach App Store Connect hoch. Apple braucht ~30 min, bis er in
TestFlight erscheint.

### Schritt 10: TestFlight-Tester einladen (15 min)

App Store Connect → TestFlight → Internal Testing → ⊕ Add Internal Group
oder bestehende Gruppe. Tester per E-Mail einladen. Sie kriegen einen
TestFlight-Link, müssen die TestFlight-App installieren, dann Vouchmi.

Bitte sie um:
- Topup mit eigenem Apple-Account (echte 4,99 €, das geht von Apple
  refundbar später — TestFlight nutzt Sandbox NICHT bei internem Test,
  außer du markierst es als „Sandbox Build")
- Boost durchspielen
- Schreibst du das selbst lieber gegen Sandbox? Setze in EAS auf den
  `preview`-Build mit `distribution: internal`, dann läuft StoreKit
  gegen Sandbox. **Empfohlen** für Free-Tester.

### Schritt 11: Grafana-Dashboard zusammenklicken (30 min)

Falls du Grafana noch nicht hast: einen Cloud-Account auf
**grafana.com** (Free Tier reicht). Oder lokal mit Docker:

```bash
docker run -d -p 3000:3000 grafana/grafana-oss
```

Neue Data Source → JSON API → URL: `https://staging-api.vouchmi.com/api/internal/credits/health`,
Authorization Header: `Bearer <CREDITS_MONITORING_TOKEN>`.

Sechs Panels anlegen:
1. **Topup-Volume €** — `windows.24h.topups_by_provider.paypal.cents_sum + apple_iap.cents_sum`
2. **Topup-Volume Credits** — `windows.24h.topups_by_provider.*.credits_sum` summiert
3. **Boost-Spend** — `windows.24h.boost_credits_spent`
4. **Reversals** — `windows.24h.reversal_credits` (sollte nahe 0 sein)
5. **Active Boosts** — `boosts.active_now`
6. **Cap-Rejections 24h** — `guard.new_user_cap_rejections_24h`

Refresh auf 1 min. Alerts: Reversals > 5 in 24h → Slack/E-Mail.

---

## Tag 4 — Submit for Review

### Schritt 12: Review Notes ins App Store Connect kopieren (15 min)

App Store Connect → Vouchmi → App Information → **App Review Information**:

- **Sign-In Required**: ✅
- **User Name**: `review@vouchmi.com`
- **Password**: das Passwort aus Schritt 1
- **Notes**: kompletten Inhalt aus [APPLE_REVIEW_NOTES.md](APPLE_REVIEW_NOTES.md)
  reinpasten (das Markdown wird in Plaintext angezeigt, das ist okay).

### Schritt 13: Version-Metadaten + Screenshots aktualisieren (45 min)

Falls noch nicht erledigt:

- **Version**: `1.0.0` (oder höher, falls schon vergeben)
- **What's New in This Version** (DE + EN):
  ```
  Vouchmi macht Reichweite demokratisch: Statt monatlicher Abos lädst du
  jetzt Credits auf und bewirbst gezielt einzelne Empfehlungen. Boost-Tarife
  ab 50 Credits (ca. 0,50 €). Alle bisherigen Premium-Features sind ab sofort
  kostenlos für alle.
  ```
- **Screenshots**: Wallet-Screen, Boost-Sheet, Beworben-Post — pro Gerätegröße
  je drei neue Screenshots. Mindestens iPhone 6.7" und 6.1" pflicht.

### Schritt 14: Submit for Review (5 min)

App Store Connect → Vouchmi → die neue Version → Build verknüpfen (der von
Schritt 9 hochgeladene Build) → **Submit for Review**.

Apple reviewt jetzt 24–48h, manchmal 5–7 Tage bei Boost-/Sponsored-content
Wording. Wenn ein Reject kommt: Reviewer schreibt eine Begründung im Resolution
Center, du antwortest dort innerhalb 24h und triggerst Re-Review.

---

## Nach App-Approval

### Schritt 15: Production-Migration ausführen (Tag X)

Erst NACHDEM die App live ist. Reihenfolge wie in [SPRINT_PLAN_CREDITS_BOOST.md](SPRINT_PLAN_CREDITS_BOOST.md):

1. DB-Snapshot ziehen
2. `php artisan subscriptions:migrate-to-credits --limit=10` (Dry-Run)
3. `--limit=10 --confirm` → DB-Stichprobe prüfen
4. `php artisan subscriptions:migrate-to-credits --confirm` (alle)
5. `php artisan subscriptions:paypal-cancel --confirm`
6. `php artisan subscriptions:sunset-emails --mode=done --confirm`
7. `.env`: `CREDITS_SUBSCRIPTIONS_SUNSET=true`
8. `.env`: `CREDITS_ENABLED=true` (in Production)
9. `php artisan config:cache`

### Schritt 16: Erste 72h überwachen

- Grafana: jede Stunde reinschauen, besonders auf Reversal-Rate
- Support-Postfach: erste Tickets innerhalb 24h erwartbar
- [RUNBOOK_CREDITS.md](RUNBOOK_CREDITS.md) parat für die häufigsten Fälle

---

## Wenn etwas hängt

- **IAP zeigt sich nicht in der App**: Product ID stimmt nicht überein,
  oder Produkt steht in App Store Connect noch auf „Missing Metadata".
  Im StoreKit-Sheet erscheint dann `Cannot connect to App Store`.
- **Build wird nicht hochgeladen**: meist eine fehlende Provisioning-Datei.
  `eas credentials` öffnet das interaktive Menü, dort neu generieren.
- **Apple lehnt ab wegen „Sponsored Content"**: im Review-Reply auf den
  DSA-Hinweis verweisen (Artikel 26) — Plattform-übliche Praxis,
  Beworben-Kennzeichnung ist sichtbar im UI.
- **PayPal-Webhook landet nicht**: in PayPal Dashboard → Webhooks → Logs
  schauen, ob Vouchmi 200 zurückgibt. 401 = Webhook-ID-Mismatch.
