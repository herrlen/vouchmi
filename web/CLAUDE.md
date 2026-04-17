# Vouchmi Website — Deployment-Paket

Komplette Marketing-Website für vouchmi.com — fertig zum Hochladen auf Linevast.

---

## Dateistruktur

```
vouchmi-site/
├── index.html              ← Onepager (Hero, Benefits, Features, Pricing, Newsletter, Press)
├── kontakt.html            ← Kontaktseite mit Formular
├── impressum.html          ← Impressum (§ 5 TMG)
├── datenschutz.html        ← Datenschutzerklärung (DSGVO)
├── agb.html                ← AGB
├── presse.html             ← Pressebereich mit Press Kit & Fact Sheet
├── kontakt.php             ← Handler für Kontaktformular
├── newsletter.php          ← Newsletter-Handler mit Double-Opt-In
├── .htaccess               ← HTTPS-Redirect, Security Headers, Caching
└── assets/
    ├── css/styles.css      ← Gesamtes Design-System
    ├── js/main.js          ← i18n (DE/EN), Cookies, Forms, Scroll-Reveal
    ├── img/                ← (hier kommen echte App-Screenshots & og-image)
    └── fonts/              ← (optional: lokale Schriften statt Google Fonts)
```

---

## 1. Upload auf Linevast (cPanel File Manager)

1. Login ins Linevast cPanel → **File Manager**
2. In den Ordner `public_html` wechseln
3. Alle Dateien aus `vouchmi-site/` dort hochladen (Drag & Drop oder Upload-Button)
4. Darauf achten, dass auch die versteckte `.htaccess` mit hochgeladen wird (im File Manager ggf. "Show Hidden Files" aktivieren)
5. Rechte setzen:
   - Dateien: **644**
   - Ordner: **755**
   - PHP-Dateien: **644** (manchmal 600 auf manchen Hostern)
6. Testen: https://vouchmi.com aufrufen

Alternativ per **FTP**: FileZilla öffnen, Zugangsdaten von Linevast eintragen, Ordner `public_html` öffnen, alles hochladen.

---

## 2. Vor Go-Live unbedingt anpassen

### Firmendaten (`impressum.html`, `kontakt.html`, `agb.html`)
- [ ] `[Vor- und Nachname]` durch echten Geschäftsführer-Namen ersetzen
- [ ] Echte Firmenanschrift statt `Beispielstraße 1`
- [ ] Telefonnummer statt `+49 40 0000000`
- [ ] Handelsregister-Nummer: `HRB XXXXXX` ersetzen
- [ ] Umsatzsteuer-ID: `DE XXXXXXXXX` ersetzen

### Rechtstexte — WICHTIG
Die rechtlichen Texte (Impressum, Datenschutz, AGB) sind **Vorlagen**. Lass sie vor Go-Live prüfen:
- Impressum + Datenschutz: [eRecht24 Generator](https://www.e-recht24.de/)
- AGB: [IT-Recht Kanzlei München](https://www.it-recht-kanzlei.de/) (empfohlen bei mehrseitigem Plattform-Modell)

### App-Store-Links (`index.html`)
Hero-Sektion, suche nach:
```html
<a href="https://apps.apple.com/app/vouchmi" ...>
<a href="https://play.google.com/store/apps/details?id=com.vouchmi" ...>
```
→ durch echte URLs ersetzen, sobald die Apps live sind.

### Open-Graph-Bild (`/assets/img/og-image.jpg`)
Für schöne Previews bei WhatsApp/Telegram/X/LinkedIn ein Bild erstellen (1200 × 630 px empfohlen) und als `og-image.jpg` in `/assets/img/` ablegen.

### E-Mail-Konfiguration (`kontakt.php`, `newsletter.php`)
Oben in der `$CONFIG`-Sektion prüfen:
```php
'recipient_email' => 'hello@vouchmi.com',
'from_email'      => 'kontakt@vouchmi.com', // muss auf der Domain existieren!
```
In Linevast cPanel: Postfach `kontakt@vouchmi.com` und `newsletter@vouchmi.com` anlegen.

**Zustellbarkeit erhöhen**: SPF- und DKIM-Record für vouchmi.com in den DNS-Einstellungen eintragen (Linevast-Support hilft dabei).

---

## 3. Features & Tests

### Sprachumschalter (DE/EN)
- Oben rechts in der Navigation
- Auswahl wird via `localStorage` gespeichert
- Alle Texte haben `data-i18n`-Attribute, Übersetzungen in `assets/js/main.js`
- Browser-Sprache wird initial erkannt

### Cookie-Banner
- Erscheint nach 1,2 s beim ersten Besuch
- Antwort wird via `localStorage` gespeichert
- Aktuell nur Dummy-Funktion — falls du später Google Analytics o.ä. einbaust, kannst du im JS die Consent-Auswertung ergänzen

### Newsletter (Double-Opt-In)
1. User trägt E-Mail ein → `newsletter.php` empfängt
2. Mail mit Bestätigungs-Link geht raus
3. Klick → E-Mail wandert in `confirmed.csv` (nur lokal auf dem Server, gesichert via .htaccess)

Später besser: Umstieg auf [Brevo](https://www.brevo.com/) oder [Mailchimp](https://mailchimp.com/) für professionelles Bounce-Handling und fertige Templates.

### Kontaktformular
- Honeypot-Feld gegen Bots
- Rate-Limiting: max. 5 Anfragen pro Stunde pro IP
- Auto-Reply an Absender
- Header-Injection-Schutz

---

## 4. Nach Go-Live

- [ ] HSTS aktivieren (in `.htaccess` auskommentierte Zeile)
- [ ] Google Search Console verifizieren (über `<meta>` oder DNS)
- [ ] Sitemap (`sitemap.xml`) & `robots.txt` erstellen (bei Bedarf)
- [ ] Echte App-Screenshots in `/assets/img/` hinterlegen und in `index.html` einbinden (aktuell: CSS-Mockups)
- [ ] Favicon in passender Auflösung als `favicon.ico` (derzeit: Inline-SVG)

---

## 5. Lokales Testen (optional)

```bash
# Im Projektordner
cd vouchmi-site
php -S localhost:8000
# -> http://localhost:8000
```

PHP muss lokal installiert sein (`brew install php` auf macOS, bzw. XAMPP/MAMP unter Windows).
`mail()` funktioniert lokal meist nicht — für Form-Tests auf Linevast hochladen.

---

## Farben, Fonts & Design-Tokens

Wenn du später etwas anpassen möchtest, alle Variablen liegen zentral in `assets/css/styles.css` ganz oben unter `:root`:

```css
--brand-deep: #1A1D2E;      /* Hintergrund Dark */
--brand-primary: #F59E0B;   /* Amber Akzent */
--brand-accent: #4F46E5;    /* Indigo Sekundär */
--brand-surface: #F8F7F4;   /* Cream Hauptfarbe hell */
```

Fonts: DM Serif Display (Display), Plus Jakarta Sans (Body), JetBrains Mono (Code) — alle via Google Fonts eingebunden.

---

## Bei Fragen

Die Struktur ist bewusst simpel gehalten — keine Build-Tools, kein npm, kein Webpack. Änderungen direkt in HTML/CSS/JS, upload via FTP/cPanel, fertig.

Wenn du später mehr brauchst (Blog, Admin-Panel, Multi-Sprachen-URLs), wäre der logische nächste Schritt ein CMS wie Strapi oder Statamic — aber für einen Marketing-Onepager ist das overkill.
