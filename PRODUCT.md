# Vouchmi — Produkt-Definition

## Elevator Pitch

Vouchmi ist eine Community-Commerce-App für Menschen, die gern shoppen und Empfehlungen austauschen. Nutzer teilen Produktlinks in kleinen Gruppen, die besten Empfehler werden von Marken als Mikro-Influencer engagiert. Affiliate-Marketing trifft WhatsApp-Gruppe.

## Zielgruppe

Menschen, die beides lieben: **Social Media** + **Shopping** + **Tipps austauschen**. Von der Fashion-Freundinnengruppe über Gamer bis zu Technik-Enthusiasten. Der Hook: Wer gut empfiehlt, verdient Rabatte oder Produkte.

## Kernmechanik

1. User teilt Produktlink in Community-Feed
2. Vouchmi hängt automatisch den Usernamen an die URL (`?ref=username`)
3. Marke sieht in ihren Analytics welcher User die meisten Klicks/Käufe bringt
4. Marke kontaktiert Top-Promoter → gibt Rabattcodes oder Gratisprodukte
5. Promoter macht mehr Posts → Flywheel

## Nutzer-Typen

### Enduser (Gratis im MVP)
- Anmeldung: **Telefonnummer + SMS-Code via Firebase Phone Auth**
- Kann Kontakte importieren & Freunde einladen (iOS Contacts Picker, DSGVO-konform)
- Profilbild, Username, Beschreibung, 1 Link
- **Maximal 1 Community erstellen** (im MVP, Pro-Abo später)
- Unbegrenzt beitreten, posten, liken, kommentieren, teilen
- Post-Limit: **500 Zeichen + 1 Link**
- Teilen via iOS Share Sheet: andere Communities, Chats, Mail, externe Apps
- Account jederzeit löschbar (Apple-Pflicht)

### Brand (Registrierung nur via Web)
- **Nicht in der App registrierbar** (Apple 3.1.1 Compliance)
- Website-Signup: `vouchmi.com/brands`
- Voraussetzungen:
  - Firmen-E-Mail (der Firmenname MUSS im Domain-Teil vorkommen, z.B. `max@nike.com`)
  - E-Mail-Verifizierung via Code
  - PayPal-Account für Abo-Zahlung
  - €5/Monat via PayPal (direkt an Vouchmi, nicht über Apple IAP)
- Brand-Login in der App möglich (kein "Brand werden"-Button)
- Brandseite: Logo, Name, Beschreibung (max 250 Zeichen), Website-Link
- Kann Top-Promoter kontaktieren und eigene Produkte promoten
- **Payouts:** Vouchmi vermittelt nur. Brand und Promoter regeln Rabatte/Gratisprodukte direkt. Kein Geldfluss über Vouchmi im MVP.

## MVP-Umfang (v1.0)

### MUSS
- [ ] Phone-Auth via Firebase (SMS-Code)
- [ ] User-Profil (Avatar, Username, Bio, Link)
- [ ] 1 Community pro User erstellen
- [ ] Community beitreten / verlassen
- [ ] Feed: Posts (500 Zeichen + Link)
- [ ] Link-Preview (Bild, Titel, Preis)
- [ ] Auto-Username an geteilte URLs anhängen
- [ ] Like + Kommentar
- [ ] Share Sheet (iOS native)
- [ ] Posts melden + User blocken (Apple 1.2 Pflicht)
- [ ] Account-Löschung in App (Apple 5.1.1 Pflicht)
- [ ] AGB + Datenschutz + Affiliate-Disclosure im Onboarding
- [ ] Kontakte-Einladung via iOS Contact Picker
- [ ] Brand-Login (Signup läuft auf Web)
- [ ] Brandseite anzeigen
- [ ] Basis-Analytics für Brands (Klicks pro Promoter, aus `?ref=`-Tracking)

### KANN (v1.1+)
- [ ] Pro-Abo für User (20 Communities) — später via Apple IAP
- [ ] Push Notifications
- [ ] Bild-Upload in Posts
- [ ] Direct Messages
- [ ] Werbung schalten (Revive Adserver)
- [ ] Android-App (React Native läuft auf beidem, nur Testing + Store-Prozess separat)
- [ ] Web-App (dünn) — Brand-Dashboard + Profil-Ansicht

## Monetarisierung

| Wer | Preis | Zahlungsweg |
|-----|-------|-------------|
| Enduser | Gratis im MVP | — |
| Enduser Pro (später) | ~€5/mo | Apple IAP (Apple zieht 15%) |
| Brand | €5/mo | PayPal über Website (KEIN Apple-Cut) |
| Vouchmi-Affiliate-Revenue | — | Provision via Amazon PartnerNet, AWIN etc. |

## Rechtlich & Compliance

### Apple App Store (siehe [COMPLIANCE.md](COMPLIANCE.md))
- IAP-Regel: Brand-Abo NUR via Web, nicht in App
- UGC-Pflichten: Report, Block, Moderation, Account-Löschung
- Affiliate-Disclosure sichtbar
- Privacy Manifest

### DSGVO
- Server-Standort EU (Linevast ist in DE)
- Kontakte werden NICHT roh gespeichert, nur gehasht verglichen
- Opt-in für Tracking
- Impressum + Datenschutz + AGB auf vouchmi.com
- Recht auf Löschung (Account-Löschung in App)
- Datenexport auf Anfrage

### Influencer-Recht
- Posts die im Auftrag einer Marke gemacht werden müssen als "Werbung" / "Anzeige" gekennzeichnet sein
- Vouchmi bietet Toggle beim Posten: "Dieser Post ist eine Kooperation mit einer Marke"

## Launch-Strategie

1. **Phase 1 (MVP, iOS):** Beta mit 20-50 Freunden/Family aus dem eigenen Netzwerk. Gründer-Community als Beispiel.
2. **Phase 2:** Erste 3-5 Brands akquirieren (aus dem persönlichen Netzwerk). Rabattcodes generieren lassen.
3. **Phase 3:** App Store Launch iOS. Warteliste, Influencer-Outreach.
4. **Phase 4:** Android + Web-Dashboard für Brands.

## Tech Stack — MVP-relevant

| Layer | Tech | Status |
|-------|------|--------|
| iOS App | React Native + Expo SDK 54 | ✅ läuft |
| Backend | Laravel 11 (lokal via Herd) | ✅ läuft |
| DB | SQLite lokal, MySQL auf Linevast (wenn PHP-Upgrade kommt) | ⚠️ wartet auf Linevast-Ticket |
| Auth | Firebase Phone Auth | ❌ muss integriert werden |
| Affiliate-Tracking | Auto `?ref=username` Rewrite | ❌ MVP-Feature |
| Link-Preview | OG-Scraper (bereits im Repo) | ✅ vorhanden |
| Push | Expo Notifications | ⏳ Post-MVP |
| Bilder-Storage | `storage/app/public` auf Linevast | ⏳ Post-MVP |
| Analytics Brands | Eigenes Dashboard (Laravel) | ❌ Post-MVP |
