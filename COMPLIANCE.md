# TrusCart — Apple App Store Compliance

Regeln, die wir zwingend vor dem ersten App-Store-Submit einhalten müssen. Quelle: [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).

## 1. In-App Purchase (Guideline 3.1.1)

**Regel:** Digitale Abos/Services, die in der App freigeschaltet werden, MÜSSEN Apple IAP nutzen (30% / 15% Commission).

**Konsequenz für TrusCart:**
- Brand-Abos (Starter €99 / Pro €299 / Enterprise €799) werden **ausschließlich über die Website** (app.truscart.com/brands) verkauft.
- In der iOS-App:
  - KEIN Kauf-Button
  - KEIN Link/Deep-Link zu Stripe-Checkout
  - KEIN Hinweis wie "Jetzt upgraden" mit externem Link
  - Erlaubt: neutraler Info-Text "Brand-Accounts werden auf truscart.com verwaltet" ohne Call-to-Action / ohne klickbaren Link.
- Affiliate-Links zu physischen Produkten (Amazon, Zalando, …) sind erlaubt — IAP greift nur bei digitalen Gütern.

## 2. User Generated Content (Guideline 1.2)

**Regel:** Apps mit UGC brauchen Moderations-Mechanismen.

**Pflicht-Features vor Launch:**
- [ ] EULA / Nutzungsbedingungen (beim Registrieren akzeptieren)
- [ ] Melde-Funktion für Posts, Kommentare, User, Communities
- [ ] Block-Funktion für User (geblockte User sind komplett unsichtbar)
- [ ] Backend-Moderation: Admin kann Inhalte & User löschen/sperren
- [ ] Reaktionszeit auf Reports: innerhalb 24h
- [ ] Filter für anstößige Inhalte (Wortliste + optional ML)

## 3. Account-Löschung (Guideline 5.1.1 v)

**Regel:** Apps mit Account-Erstellung MÜSSEN eine In-App-Löschfunktion anbieten.

**Pflicht:**
- [ ] Button "Account löschen" in Profil/Settings
- [ ] Wirklich löschen, nicht nur deaktivieren
- [ ] User-Daten, Posts, Kommentare, Chats werden gelöscht oder anonymisiert
- [ ] Bestätigungs-Dialog mit klarer Warnung

## 4. Privacy (Guideline 5.1)

**Pflicht:**
- [ ] `ios/PrivacyInfo.xcprivacy` Manifest mit allen verwendeten APIs & Datentypen
- [ ] Datenschutzerklärung (URL in App Store Connect + In-App verlinkt)
- [ ] App Tracking Transparency Prompt, falls Matomo Cross-App-Tracking nutzt → prüfen, ob Matomo nur First-Party-Analytics macht (dann kein ATT nötig)
- [ ] Keine Daten-Sammlung ohne Zweckangabe im Privacy Manifest
- [ ] Minimale Permissions — nur anfragen wenn genutzt (Kamera, Fotos, Notifications)

## 5. Minimum Functionality (Guideline 4.2)

**Regel:** Keine reine Web-View-Hülle.

**Status:** Erfüllt — wir haben native Navigation, State, Offline-fähige Komponenten.

## 6. Safety & Transparenz (Guideline 1.1 + 5.4)

**Affiliate-Disclosure:**
- [ ] Footer/Info-Screen: "TrusCart erhält bei einigen geteilten Links eine Provision vom Händler. Für dich entstehen keine Mehrkosten."
- [ ] AGB enthalten Affiliate-Hinweis
- [ ] Bei Link-Embeds optional kleines Badge "Affiliate"

## 7. Sign in with Apple (Guideline 4.8)

**Regel:** Wenn ein Drittanbieter-Login (Google, Facebook) angeboten wird, MUSS auch "Sign in with Apple" angeboten werden.

**Status:** Aktuell nur E-Mail/Passwort → keine Pflicht. Sobald Social Login dazukommt: Apple Sign-In pflicht.

## 8. Kids / Alter (Guideline 1.3 + 5.1.4)

- [ ] Mindestalter im Registrierungs-Flow (16+ empfohlen, DSGVO)
- [ ] App Store Altersfreigabe korrekt angeben

## Pflicht-Checkliste vor erstem Submit

- [ ] AGB + Datenschutz + Impressum online (truscart.com/legal)
- [ ] In-App-Links zu AGB/Datenschutz
- [ ] Account-Löschung implementiert
- [ ] Report- & Block-Funktion implementiert
- [ ] Brand-Signup aus der App entfernt / neutralisiert
- [ ] Privacy Manifest angelegt
- [ ] Affiliate-Disclosure sichtbar
- [ ] Demo-Account für App-Review (Apple verlangt Test-Login)
