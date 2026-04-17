# Vouchmi — App Privacy Questionnaire (App Store Connect)

Arbeits-Dokument für die Datenschutz-Abfrage in App Store Connect. Abgeleitet aus Apples offizieller Datentypen-Liste (Stand April 2026) und dem aktuellen Vouchmi-Feature-Set.

**Pfad in App Store Connect:** My Apps → Vouchmi → App-Datenschutz → Bearbeiten

---

## Grundsatzantworten

| Frage | Antwort | Warum |
|---|---|---|
| Sammelt die App Daten? | **Ja** | E-Mail, Name, Passwort bei Registrierung |
| Werden Daten für Tracking verwendet? | **Nein** | Kein Tracking-SDK, keine Drittanbieter-Werbung |
| Benötigt die App den ATT-Dialog? | **Nein** | Kein AppTrackingTransparency nötig |

---

## Zu deklarierende Datentypen

### Contact Info
- **Name** → App Functionality, Linked = Ja
- **Email Address** → App Functionality, Linked = Ja
- **Phone Number** → App Functionality, Linked = Ja (nur Influencer)
- **Other User Contact Info** → App Functionality, Linked = Ja (Firmenname, PayPal-E-Mail)

### Identifiers
- **User ID** → App Functionality + Analytics, Linked = Ja
- **Device ID** → App Functionality, Linked = Ja (expo-notifications Push-Token)

### User Content
- **Photos or Videos** → App Functionality, Linked = Ja (Profilbild, Post-Bilder)
- **Other User Content** → App Functionality + Product Personalization, Linked = Ja

### Usage Data
- **Product Interaction** → Analytics + Product Personalization, Linked = Ja

### Purchases
- **Purchase History** → App Functionality, Linked = Ja (Brand-Abo-Status)

### Diagnostics
- **Crash Data** → App Functionality, Linked = Nein (anonymisiert)
- **Performance Data** → Analytics, Linked = Nein

---

## Nicht erhobene Kategorien
Health & Fitness, Location, Sensitive Info, Contacts, Browsing History, Financial Info (PayPal extern), Advertising Data

---

## URLs für App Store Connect

| Feld | URL |
|---|---|
| Privacy Policy URL | `https://vouchmi.com/datenschutz` |
| Privacy Choices URL | `https://vouchmi.com/datenschutz/kontrolle` |

---

## Checkliste vor Submit

- [ ] Alle Datentypen in App Store Connect eingetragen
- [ ] Für jeden: Zwecke angekreuzt, Linked=Ja/Nein, Tracking=Nein
- [ ] Privacy Policy URL live
- [ ] "Account löschen" in-App implementiert
- [ ] Kein ATT-Dialog im Code
- [ ] PrivacyInfo.xcprivacy mit NSPrivacyTracking = false
