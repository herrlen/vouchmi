# Infrastruktur-Übersicht

Wo alles liegt, wie es zusammenspielt, wie du reinkommst, wie du deployst.
Stand: 2026-04-24.

---

## Das große Bild

```
                              Internet
                                 │
            ┌────────────────────┼────────────────────┐
            │                    │                    │
       vouchmi.com         api.vouchmi.com       app.vouchmi.com
            │                    │                    │
       Mittwald             Mittwald             Mittwald
       Webhosting           Webhosting            vServer
       (Marketing)           (Laravel)            (Next.js)
            │                    │                    │
       ~/html/vouchmi      ~/vouchmi-app/       ~/html/portal-node
                             backend/          (Node-Prozess, Port 3000,
                                                Apache-Reverse-Proxy)
```

Mobile-App redet direkt mit `api.vouchmi.com`. Portal redet intern über
Next.js-Rewrites ebenfalls mit `api.vouchmi.com`. Aus Browser-Sicht bleibt
das Portal same-origin unter `app.vouchmi.com`.

---

## Mittwald mStudio — die zwei Projekte

| Feld | Webhosting | vServer |
|---|---|---|
| Name in mStudio | `vouchmi` | `vouchmi-portal` |
| Produkt | Managed Webhosting | vServer (Managed Hosting) |
| Kosten | laufend (vorher bestehend) | 21 €/Monat (ab 2026-04-24) |
| Zweck | PHP + Marketing-Site + Laravel-API | Node.js für das Next.js-Portal |
| Hauptdomain | `vouchmi.com` (Marketing) + `api.vouchmi.com` (Laravel) | `app.vouchmi.com` (Portal) |
| Apps darin | Eine PHP-App (`vouchmi`) | `portal-node` (Node.js 25.4.0) + `claude-code-deploy` (PHP, unbenutzt) |

---

## SSH-Zugänge

Auf deinem Mac in `~/.ssh/config` hinterlegt. Key: `~/.ssh/mittwald_vouchmi`.

| Alias | Benutzer | Host | Öffnet |
|---|---|---|---|
| `mittwald-vouchmi` | `ssh-q5tx7t@a-f42rbp` | `ssh.altgemeinde.project.host` | Webhosting-Projekt (Laravel + Marketing) |
| `mittwald-portal` | `len.messerschmidt@gmail.com@a-fn2rvw` | `ssh.schmalge.project.host` | vServer-Projekt (Next.js Portal) |

Benutzung: `ssh mittwald-vouchmi` bzw. `ssh mittwald-portal`.

Der Key liegt zentral im Mittwald-Profil (nicht per Projekt). Wenn du ihn
mal austauscht, musst du nur den neuen Public Key in mStudio → Profil →
SSH-Keys hochladen.

---

## Datei-Layout

### Webhosting (Laravel + Marketing)

```
~/html/vouchmi/              # Marketing-Site (vouchmi.com) + Laravel-Entry-Point
  ├── index.html             # Marketing-Landingpage
  ├── index.php              # Laravel-Router-Eintritt
  ├── .htaccess              # URL-Rewrites
  ├── agb.html, datenschutz.html, ...
  └── storage → /home/p-nx3hfv/vouchmi-app/backend/storage/app/public (Symlink)

~/vouchmi-app/backend/       # Laravel 11 Codebase
  ├── .env                   # APP_URL, DB, MAIL, SANCTUM — Produktions-Config
  ├── artisan                # Laravel CLI
  ├── app/Http/Controllers/  # Controllers inkl. AuthController.php
  ├── routes/api.php         # alle API-Endpoints
  ├── storage/logs/laravel.log  # Laravel-Error-Log
  └── .env.backup.YYYYMMDD*  # Backups meiner .env-Edits
```

### vServer (Portal)

```
~/html/portal-node/          # Next.js 16 Produktions-Build (Mittwald-App-Root)
  ├── .env.production        # BACKEND_URL=https://api.vouchmi.com, NEXT_PUBLIC_APP_URL
  ├── package.json           # "build": "next build --webpack"
  ├── next.config.ts         # Rewrites /api/* zu api.vouchmi.com
  ├── proxy.ts               # Auth-Guard-Middleware (Next.js 16)
  ├── .next/                 # Build-Output (wird bei jedem Build neu erzeugt)
  ├── node_modules/          # pnpm-Deps
  └── app/, components/, lib/  # Next.js-App-Code

~/repo/                      # Git-Clone vom GitHub-Repo (für Deploy-Sync)
  └── portal/                # → wird via rsync nach ~/html/portal-node/ übertragen
```

---

## Deploy-Workflow

### Portal-Änderung (Code am Desktop geändert)

```bash
# 1. Lokal: commit + push
cd /Users/len/Desktop/truscart-app
git add portal/...
git commit -m "..."
git push origin main

# 2. Auf vServer: pull + sync + rebuild + restart
ssh mittwald-portal "
  cd ~/repo && git pull --ff-only &&
  rsync -a --delete \
    --exclude=node_modules --exclude=.next --exclude=.env.production \
    ~/repo/portal/ ~/html/portal-node/ &&
  PIDS=\$(ps -ef | grep -E 'next-server|pnpm start' | grep -v grep | awk '{print \$2}')
  [ -n \"\$PIDS\" ] && kill \$PIDS
  sleep 2
  cd ~/html/portal-node && pnpm build &&
  ( pnpm start < /dev/null > /tmp/next.log 2>&1 & )
"
```

### Laravel-Änderung

- Editieren direkt per SSH (nano/vim) oder per Git, wenn Laravel-Repo auf GitHub liegt
- Nach ENV-Änderungen: `php artisan config:clear`
- Nach Code-Änderungen ohne Cache: nichts nötig

---

## Logs

| Was | Wo |
|---|---|
| Laravel (Fehler, Warnings, Request-Logs) | `~/vouchmi-app/backend/storage/logs/laravel.log` |
| Next.js (manuell gestartet) | `/tmp/next.log` (vergeht beim Container-Reboot) |
| Next.js (via Mittwald mittnite) | `/var/log/nodejs/4f2b533a-*-stdout.log` + `-stderr.log` |
| Apache (Portal) | Keine direkte Datei, aber über mStudio → Monitoring einsehbar |

### Logs einsehen

```bash
# Laravel-Errors der letzten Zeit
ssh mittwald-vouchmi "grep -E '^\\[.*\\] production\\.(ERROR|WARNING)' ~/vouchmi-app/backend/storage/logs/laravel.log | tail -20"

# Portal-Logs
ssh mittwald-portal "tail -50 /tmp/next.log"
```

---

## Häufige Operationen

### User-Rolle ändern (user ↔ influencer ↔ brand)

```bash
ssh mittwald-vouchmi "cd ~/vouchmi-app/backend && \
  php artisan tinker --execute=\"\\App\\Models\\User::where('email', 'EMAIL')->update(['role' => 'ROLE']);\""
```

Ersetze `EMAIL` und `ROLE` (`user` / `influencer` / `brand`). Der User
muss danach nur die Seite neu laden (Token bleibt gültig).

### User löschen (z.B. Testkonten)

```bash
ssh mittwald-vouchmi "cd ~/vouchmi-app/backend && \
  php artisan tinker --execute=\"\\App\\Models\\User::where('email', 'EMAIL')->delete();\""
```

### Laravel-Konfig-Cache leeren

```bash
ssh mittwald-vouchmi "cd ~/vouchmi-app/backend && php artisan config:clear && php artisan cache:clear"
```

### Next.js manuell neu starten

```bash
ssh mittwald-portal "
  PIDS=\$(ps -ef | grep -E 'next-server|pnpm start' | grep -v grep | awk '{print \$2}')
  [ -n \"\$PIDS\" ] && kill \$PIDS
  sleep 2
  cd ~/html/portal-node && ( pnpm start < /dev/null > /tmp/next.log 2>&1 & )
"
```

---

## Backups

Mittwald legt automatische Backups an (bei beiden Projekten). Prüfe
Retention und Restore-Prozess:

- mStudio → Projekt → **Backups**
- Oder bei beiden Projekten: Projekt → **EasyCloudBackup** (Extension sichtbar in Sidebar)

**Empfehlung**: Einmal einen Test-Restore simulieren, bevor du in Panik
gerätst. Passiert am besten auf einer Staging-Kopie, nicht auf Prod.

---

## Monitoring

**Nicht eingerichtet.** Empfehlung:

- [UptimeRobot](https://uptimerobot.com) — kostenloser Tier, monitort
  `https://app.vouchmi.com/login` und `https://api.vouchmi.com/api/legal/imprint`
  alle 5 Minuten, schickt E-Mail bei Ausfall
- Alternativ: Mittwald hat eingebautes Monitoring im vServer-Projekt —
  mStudio → vServer → **Monitoring** — Load, Memory, Disk

---

## Bekannte offene Punkte

Stand 2026-04-24 — die fixen wir, wenn's Zeit und Grund dafür gibt:

1. **mittnite-Startbefehl auf vServer**: Startet automatisch `yarn start`,
   was wegen pnpm-lockfile crasht. Aktuell wird Next.js manuell per
   `pnpm start`-Subshell gestartet. Bei Container-Reboot muss das Portal
   manuell neu gestartet werden. Fix: in mStudio App-Konfig den Startbefehl
   von `yarn` auf `pnpm` umstellen, falls es so ein Feld gibt. Sonst
   Workaround-Skript.

2. **Universal Links für Mobile-App**: `app.config.ts` hat
   `associatedDomains: ["applinks:app.vouchmi.com"]`. Für echte iOS-
   Universal-Links muss `https://app.vouchmi.com/.well-known/apple-app-site-association`
   erreichbar sein. Next.js muss diese Datei ausliefern. Folgt.

3. **Mail-SMTP-Passwort im Chat**: Das Passwort für `noreply@vouchmi.com`
   steht im Git-Commit-Log (Passwort an Claude). Vor Prod-Launch ändern
   und `.env` updaten.

4. **BACKEND-TODO.md** im Repo-Root enthält weitere Backend-Anpassungen
   (z.B. `/api/users/by-username/:username` für Public-Profile-Lookup).

---

## Emergency-Playbook

### Portal ist down (`app.vouchmi.com`)

1. `ssh mittwald-portal "ps -ef | grep next-server | grep -v grep"` — läuft der Prozess?
2. Wenn nicht: `ssh mittwald-portal "cd ~/html/portal-node && ( pnpm start < /dev/null > /tmp/next.log 2>&1 & )"`
3. Logs prüfen: `ssh mittwald-portal "tail -50 /tmp/next.log"`
4. Apache auf vServer sollte nicht ausfallen, aber falls doch: mStudio → vServer → Apps → portal-node → „Aktionen" → Restart

### Laravel ist down (`api.vouchmi.com`)

1. Direkte Laravel-Tests: `curl -sI https://api.vouchmi.com/api/legal/imprint`
2. Errors: `ssh mittwald-vouchmi "tail -100 ~/vouchmi-app/backend/storage/logs/laravel.log"`
3. Config-Cache zerschossen: `ssh mittwald-vouchmi "cd ~/vouchmi-app/backend && php artisan config:clear"`
4. Notfall: in mStudio → vouchmi-Projekt → Apps → vouchmi → „Aktionen" → Restart

### DNS-Probleme

- `dig +short app.vouchmi.com` → sollte eine IP/CNAME liefern, die auf Mittwald vServer zeigt
- `dig +short api.vouchmi.com` → sollte Mittwald Webhosting-IP sein
- DNS verwaltet Mittwald selbst (Nameserver: `mittwald`), Änderungen in mStudio → Domains

### Alles aus — totaler Restart

Bei gröberen Problemen: in mStudio beide Projekte durchgehen, bei jedem die Apps
neustarten. Reboot des vServer-Containers ist die Holzhammer-Methode und dauert
~2 Minuten.

---

## Änderungs-Historie dieses Dokuments

- 2026-04-24: erste Version nach Rollout von Portal auf vServer
