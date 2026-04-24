# Deployment — Vouchmi Portal

Portal (Next.js 16) und Laravel-Backend laufen same-origin auf
`app.vouchmi.com`. Dieses Dokument beschreibt das Nginx-Setup und die
Rollout-Checkliste.

## Architektur (Produktion)

```
                     Internet
                        │
                https://app.vouchmi.com
                        │
                     Nginx
         ┌──────────────┴──────────────┐
         │                             │
  /api, /sanctum,                Alles andere
  /storage, /admin,                    │
  /broadcasting                  Next.js (Node)
         │                             │
         ▼                             ▼
   Laravel/PHP-FPM                port 3000
   (bestehend, unverändert)
```

Kein DNS-Wechsel, kein Backend-Move.

## Nginx-Config (Snippet)

Siehe bestehende Config für `app.vouchmi.com`. Die folgenden Location-Blöcke
müssen hinzugefügt/angepasst werden. Reihenfolge beachten — längster Prefix
gewinnt bei Nginx.

```nginx
# /etc/nginx/sites-available/app.vouchmi.com

upstream portal {
    server 127.0.0.1:3000;
    keepalive 16;
}

server {
    listen 443 ssl http2;
    server_name app.vouchmi.com;

    # SSL und bestehende Settings wie gehabt …

    # ───────────────────────────────────────────────
    # Laravel-Pfade (bleiben bei PHP-FPM wie bisher)
    # ───────────────────────────────────────────────
    root /var/www/backend/public;
    index index.php;

    # API, Sanctum, Storage, Admin, Broadcasting → Laravel
    location /api/ {
        try_files $uri $uri/ /index.php?$query_string;
    }
    location /sanctum/ {
        try_files $uri $uri/ /index.php?$query_string;
    }
    location /storage/ {
        try_files $uri $uri/ /index.php?$query_string;
    }
    location /admin/ {
        try_files $uri $uri/ /index.php?$query_string;
    }
    location /broadcasting/ {
        try_files $uri $uri/ /index.php?$query_string;
    }
    location /webhooks/ {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # Laravel-internes (health checks, etc.)
    location = /up {
        try_files $uri /index.php?$query_string;
    }

    # PHP-FPM
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # ───────────────────────────────────────────────
    # Next.js-Portal (alles was oben nicht matched)
    # ───────────────────────────────────────────────
    location /_next/ {
        proxy_pass http://portal;
        proxy_cache_valid 200 60m;
        proxy_set_header Host $host;
    }

    location / {
        proxy_pass http://portal;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

**Wichtig:** Next.js schreibt `/_next/static/*` mit langer Cache-Zeit — Nginx
kann das gut direkt proxy-cachen.

## systemd-Unit für Next.js

```ini
# /etc/systemd/system/vouchmi-portal.service
[Unit]
Description=Vouchmi Portal (Next.js)
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/portal
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=BACKEND_URL=https://app.vouchmi.com
Environment=NEXT_PUBLIC_APP_URL=https://app.vouchmi.com
ExecStart=/usr/bin/pnpm start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now vouchmi-portal
sudo systemctl status vouchmi-portal
```

## Rollout-Checkliste

### Vor dem Push auf Prod

- [ ] `pnpm build` läuft lokal ohne Errors
- [ ] `pnpm typecheck` grün
- [ ] `pnpm lint` grün
- [ ] Login gegen produktives Backend mit Testnutzer smoketesten (staging-Nginx-Setup)
- [ ] Backend-TODO.md durchgehen — mindestens die 🟥-Punkte erledigt oder
      dokumentiert

### Erster Deploy

1. `ssh` auf den Server
2. Code in `/var/www/portal` clonen (aus `truscart-app/portal` beziehen)
3. `pnpm install --frozen-lockfile`
4. `.env.local` erstellen:
   ```
   BACKEND_URL=https://app.vouchmi.com
   NEXT_PUBLIC_APP_URL=https://app.vouchmi.com
   ```
5. `pnpm build`
6. systemd-Unit installieren (siehe oben), `systemctl start vouchmi-portal`
7. Nginx-Config erweitern um die Portal-Location-Blöcke
8. `nginx -t` → wenn grün, `nginx -s reload`
9. Smoketests:
   - `curl -I https://app.vouchmi.com/login` → 200
   - `curl -I https://app.vouchmi.com/api/auth/login` → 405 (Laravel antwortet, Methode nicht erlaubt für GET)
   - Browser: Login + Role-Redirect prüfen

### Backend-Seite (Parallel)

- [ ] `.env` um `SANCTUM_STATEFUL_DOMAINS=app.vouchmi.com` erweitern (optional,
      siehe BACKEND-TODO.md)
- [ ] `APP_URL=https://app.vouchmi.com` ist bereits gesetzt (unverändert lassen)
- [ ] Verify-E-Mail-Link Mobile vs. Web differenzieren (siehe BACKEND-TODO.md)

### Rollback

Falls das Portal problematisch ist:

1. `systemctl stop vouchmi-portal`
2. In Nginx-Config die `location /` + `location /_next/` auskommentieren
3. `nginx -s reload`

Laravel läuft dann wieder wie vor dem Rollout auf `app.vouchmi.com`.

## Monitoring

- systemd journal: `journalctl -u vouchmi-portal -f`
- Nginx access.log
- Metric-Idee: Status-404-Rate auf `/` als Frühwarnung für Next.js-down

## Performance-Hinweis

Next.js 16 nutzt Turbopack per Default für Build und Dev. Der Production-Build
rendert Auth-Seiten statisch (`○`) und Dashboard-Seiten dynamisch (`ƒ`) —
Bundle-Sizes bleiben klein, weil Server Components den JS-Bundle nicht aufblähen.
