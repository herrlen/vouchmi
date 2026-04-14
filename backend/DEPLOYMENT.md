# Vouchmi Backend — Deployment auf Shared Hosting (cPanel)

Deployment-Anleitung für das Laravel 11 Backend auf `app.vouchmi.com`.

**Voraussetzungen Hosting:**
- PHP 8.2 oder höher (cPanel → *MultiPHP Manager*)
- MySQL 5.7+ / MariaDB 10.3+
- Aktivierte PHP-Extensions: `openssl`, `pdo_mysql`, `mbstring`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`, `fileinfo`, `curl`, `gd`
- Optional: SSH-Zugang oder cPanel *Terminal* (für `composer` und `artisan`)

---

## 1. Vorbereitung lokal

```bash
cd backend
composer install --no-dev --optimize-autoloader
```

Vendor-Ordner wird mit-hochgeladen (Shared Hosting hat oft kein Composer).

ZIP bauen (ohne `.git`, `node_modules`, `tests`, lokale `.env`):

```bash
cd backend
zip -r ../vouchmi-backend.zip . \
  -x ".git/*" "node_modules/*" "tests/*" ".env" "storage/logs/*" "storage/framework/cache/*"
```

---

## 2. MySQL-Datenbank anlegen (cPanel)

1. cPanel → **MySQL® Databases**
2. Datenbank erstellen: `vouchmi_app` (cPanel macht daraus meist `cpaneluser_vouchmi_app`)
3. User erstellen mit starkem Passwort
4. User der Datenbank zuweisen → **ALL PRIVILEGES**
5. Exakten DB-Namen, User, Passwort notieren

---

## 3. Dateien auf Server hochladen

Ziel-Struktur auf Shared Hosting (empfohlen, Laravel-konform):

```
/home/cpaneluser/
├── vouchmi-app/              ← Laravel-Kern (NICHT public)
│   ├── app/
│   ├── bootstrap/
│   ├── config/
│   ├── database/
│   ├── resources/
│   ├── routes/
│   ├── storage/
│   ├── vendor/
│   ├── artisan
│   ├── composer.json
│   └── .env                   ← auf dem Server anlegen
│
└── public_html/
    └── app.vouchmi.com/       ← Subdomain-DocumentRoot (public/)
        ├── index.php          ← aus vouchmi-app/public/
        ├── .htaccess          ← aus vouchmi-app/public/
        ├── favicon.ico
        ├── robots.txt
        └── storage/           ← Symlink zu ../vouchmi-app/storage/app/public
```

### Schritt-für-Schritt via cPanel File Manager

1. **Subdomain anlegen:** cPanel → *Subdomains* → `app.vouchmi.com` → Document Root auf `public_html/app.vouchmi.com` setzen.
2. **ZIP hochladen:** File Manager → Home-Verzeichnis → *Upload* → `vouchmi-backend.zip` → *Extract* nach `vouchmi-app/`.
3. **public/ verschieben:**
   - Inhalt von `vouchmi-app/public/` (inkl. `.htaccess` — verstecke Dateien sichtbar machen!) nach `public_html/app.vouchmi.com/` kopieren.
   - Ordner `vouchmi-app/public/` anschließend leeren (aber nicht löschen, Laravel checkt Existenz).

4. **index.php anpassen:** In `public_html/app.vouchmi.com/index.php` die Pfade korrigieren:

   ```php
   require __DIR__.'/../../vouchmi-app/vendor/autoload.php';
   $app = require_once __DIR__.'/../../vouchmi-app/bootstrap/app.php';
   ```

---

## 4. `.env` erzeugen

Auf dem Server in `vouchmi-app/.env` (von `.env.example` kopieren):

```env
APP_NAME=Vouchmi
APP_ENV=production
APP_KEY=                       # wird in Schritt 6 generiert
APP_DEBUG=false
APP_URL=https://app.vouchmi.com

APP_LOCALE=de

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=cpaneluser_vouchmi_app
DB_USERNAME=cpaneluser_vouchmi
DB_PASSWORD=********

CACHE_DRIVER=file
QUEUE_CONNECTION=sync
SESSION_DRIVER=file

SANCTUM_STATEFUL_DOMAINS=app.vouchmi.com
SESSION_DOMAIN=.vouchmi.com

AMAZON_PARTNER_TAG=vouchmi-21
AWIN_PUBLISHER_ID=
AWIN_API_TOKEN=
```

---

## 5. `.htaccess` — Document Root

In `public_html/app.vouchmi.com/.htaccess` (kommt aus `vouchmi-app/public/.htaccess`):

```apache
<IfModule mod_rewrite.c>
    <IfModule mod_negotiation.c>
        Options -MultiViews -Indexes
    </IfModule>

    RewriteEngine On

    # HTTPS erzwingen
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

    # Authorization Header durchreichen (Sanctum!)
    RewriteCond %{HTTP:Authorization} .
    RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

    # Trailing Slash entfernen
    RewriteRule ^(.*)/$ /$1 [L,R=301]

    # Alles an index.php
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteRule ^ index.php [L]
</IfModule>
```

**Root-.htaccess** in `public_html/` sollte KEINE Regel enthalten, die `app.vouchmi.com` umleitet.

---

## 6. Artisan-Befehle (cPanel Terminal oder SSH)

```bash
cd ~/vouchmi-app

# Falls composer lokal nicht ausgeführt: hier nachholen
composer install --no-dev --optimize-autoloader

# App-Key generieren (einmalig!)
php artisan key:generate --force

# Migrations ausführen
php artisan migrate --force

# Storage-Link (zeigt public/storage auf storage/app/public)
# WICHTIG: Da public verschoben wurde, Symlink manuell:
ln -s ~/vouchmi-app/storage/app/public ~/public_html/app.vouchmi.com/storage

# Caches bauen
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
```

### Falls kein Terminal verfügbar

- **Composer:** bei allen großen Hostern (All-Inkl, Hetzner, IONOS, Strato, Domainfactory) gibt es eine Web-UI unter *„Composer"* oder *„PHP-Composer"*.
- **artisan:** alternativ lokal `php artisan migrate` gegen die Remote-DB ausführen (MySQL Remote-Access vorübergehend erlauben).
- **Key generieren:** `php -r "echo 'base64:'.base64_encode(random_bytes(32)).PHP_EOL;"` und Ausgabe in `.env` als `APP_KEY` eintragen.

---

## 7. Permissions

Via File Manager → *Permissions* oder SSH:

```bash
cd ~/vouchmi-app
chmod -R 755 .
chmod -R 775 storage bootstrap/cache
# Owner meistens schon korrekt; falls nicht:
# chown -R cpaneluser:cpaneluser storage bootstrap/cache
```

`.env` nicht web-erreichbar, aber lesbar für PHP: `chmod 640 .env`.

---

## 8. SSL-Zertifikat

cPanel → **SSL/TLS Status** → `app.vouchmi.com` wählen → *Run AutoSSL* (Let's Encrypt).
Prüfen: `https://app.vouchmi.com/api/ping` sollte 200 liefern (falls Ping-Route existiert) oder 404 (NICHT 500).

---

## 9. Post-Deploy Smoke Tests

```bash
# Health
curl -i https://app.vouchmi.com/api/auth/register -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@vouchmi.com","password":"test1234","password_confirmation":"test1234","username":"testuser"}'

# Sollte 201 + Token liefern
```

Logs bei Problemen: `vouchmi-app/storage/logs/laravel.log`.

---

## 10. Updates ausrollen

Für spätere Updates:

```bash
cd ~/vouchmi-app
php artisan down
# Code via git pull oder ZIP ersetzen (vendor/ mit-aktualisieren!)
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan up
```

---

## Troubleshooting

| Symptom | Ursache | Fix |
|---|---|---|
| 500 Error, leere Seite | Permissions `storage/` | `chmod -R 775 storage bootstrap/cache` |
| `APP_KEY` fehlt | Key nicht generiert | `php artisan key:generate` |
| 404 bei allen API-Routes | `.htaccess` fehlt | Aus `public/.htaccess` übernehmen |
| Auth-Token ignoriert | `HTTP_AUTHORIZATION` Regel fehlt | `.htaccess` Block ergänzen |
| `SQLSTATE[HY000] [2002]` | DB-Host/User falsch | `.env` prüfen |
| Upload-Fehler | `post_max_size` / `upload_max_filesize` | cPanel → *MultiPHP INI Editor* |
