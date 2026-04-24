# Deployment — Vouchmi Portal

Portal (Next.js 16) läuft auf **Vercel**, Laravel-Backend bleibt auf **Mittwald**.
Aus Browser-Sicht ist alles same-origin unter `app.vouchmi.com`, weil Vercel
`/api/*` serverseitig an `api.vouchmi.com` (Mittwald) proxyt.

## Ziel-Topologie

```
                           Internet
                              │
                      app.vouchmi.com        api.vouchmi.com
                      (DNS → Vercel)         (DNS → Mittwald)
                              │                      │
                         Vercel Edge            Mittwald Webhosting
                              │                      │
                      Next.js (Node)           Laravel / PHP-FPM
                              │                      │
                              └── /api/* Rewrite ───►│
                                   (server-side)

   Mobile App ────────── direkt ─────────►  api.vouchmi.com
```

- `app.vouchmi.com` → Vercel → zeigt das Portal
- `api.vouchmi.com` → Mittwald → zeigt Laravel-API
- Portal ruft `api.vouchmi.com` via serverseitigem fetch (BACKEND_URL)
- Browser-Fetches (TanStack Query etc.) nutzen weiter `/api/*` → Vercel-Rewrite
- Mobile App redet direkt mit `api.vouchmi.com`, kein Umweg über Vercel

## Deployment-Ablauf (Erstrollout)

Reihenfolge ist wichtig — folge strikt dieser Sequenz, damit es keine Downtime gibt.

### Phase 1 · Mittwald: `api.vouchmi.com` als zweiten Hostnamen einrichten

Laravel hört ab jetzt auf zwei Hostnamen — `app.vouchmi.com` (wie bisher) und
zusätzlich `api.vouchmi.com`. Später ziehen wir `app.vouchmi.com` zu Vercel um.

1. mStudio → dein Webhosting-Projekt → **Domains** → **Hostname hinzufügen**
2. Hostname: `api.vouchmi.com`
3. DocumentRoot: identisch zur bestehenden `app.vouchmi.com`-Konfiguration (zeigt auf Laravel)
4. SSL-Zertifikat via Let's Encrypt ausrollen (klickbar)
5. Warten bis DNS und Cert grün sind

Danach erreichbar und testbar:

```bash
curl -s https://api.vouchmi.com/api/legal/imprint | head -c 100
# sollte JSON zurückgeben
```

### Phase 2 · Laravel `.env` auf Mittwald ergänzen

SSH auf Mittwald, `.env` im Laravel-Root editieren:

```env
APP_URL=https://app.vouchmi.com        # bleibt Portal-URL (für Reset-Links)
SANCTUM_STATEFUL_DOMAINS=app.vouchmi.com
SESSION_SECURE_COOKIE=true
```

Dann:

```bash
php artisan config:clear
php artisan cache:clear
```

### Phase 3 · Mobile App umstellen

Zwei Ebenen:

**a) `.env` (dev-Umgebung):**

```env
EXPO_PUBLIC_API_URL=https://api.vouchmi.com/api
```

**b) Hardcoded URLs in Produktion:**

- `app.config.ts`
- `src/lib/api.ts`
- `app/brand-register.tsx` (PayPal return URL)
- `app/influencer-register.tsx` (PayPal return URL)

Alle `app.vouchmi.com` → `api.vouchmi.com`.

Neuen Build machen (`eas build` oder `expo export`) und TestFlight-/Store-Submission
vorbereiten. Alter Build redet weiter mit app.vouchmi.com — das ist unproblematisch,
solange wir in Phase 5 den Mittwald-Hostname `app.vouchmi.com` nicht abschalten.

### Phase 4 · Vercel: Portal deployen

1. **GitHub-Repo pushen** (falls noch nicht geschehen):

   ```bash
   cd /Users/len/Desktop/truscart-app
   git remote add origin git@github.com:<user>/<repo>.git   # falls nicht vorhanden
   git push -u origin main
   ```

2. [vercel.com](https://vercel.com) → **Sign up** mit GitHub
3. **New Project** → Repo importieren
4. **Root Directory**: `portal` (wichtig! sonst baut Vercel den Mobile-Code)
5. **Framework Preset**: Next.js (wird auto-erkannt)
6. **Build Command**: `pnpm build` (Default)
7. **Environment Variables** setzen:

   | Name | Value |
   |------|-------|
   | `BACKEND_URL` | `https://api.vouchmi.com` |
   | `NEXT_PUBLIC_APP_URL` | `https://app.vouchmi.com` |

8. **Deploy** klicken

Nach ~2 Minuten gibt's eine Preview-URL wie `vouchmi-portal.vercel.app`. Damit
schon jetzt Login und Dashboard testen (Vercel → Mittwald api.vouchmi.com).

### Phase 5 · Custom Domain `app.vouchmi.com` auf Vercel

1. Vercel → Project → **Settings** → **Domains** → **Add**
2. Eingabe: `app.vouchmi.com`
3. Vercel zeigt dir einen CNAME-Target (meistens `cname.vercel-dns.com`)
4. mStudio → **DNS** für `vouchmi.com` öffnen
5. Den bestehenden A-Record für `app` **ersetzen** durch:

   ```
   app    CNAME   cname.vercel-dns.com
   ```

6. Speichern. DNS-Propagation dauert 5–30 Minuten, teils bis zu 24h
7. Vercel validiert das Let's-Encrypt-Cert automatisch, sobald DNS zeigt

Solange Propagation läuft, sehen User je nach DNS-Cache entweder Portal (Vercel) oder
Laravel (Mittwald). Beides antwortet, nur unterschiedlich. Keine Fehler.

### Phase 6 · Verifikation

```bash
# Portal erreichbar via Vercel?
curl -I https://app.vouchmi.com/login
# → HTTP/2 200, server: Vercel

# Backend via Vercel-Rewrite erreichbar?
curl -I https://app.vouchmi.com/api/legal/imprint
# → HTTP/2 200

# Backend direkt erreichbar?
curl -I https://api.vouchmi.com/api/legal/imprint
# → HTTP/2 200, server: nginx (Mittwald)
```

Im Browser:

1. `https://app.vouchmi.com` → leitet je nach Auth-Status auf `/login` oder Dashboard
2. Registrierung mit Test-E-Mail → Session-Cookie gesetzt, Redirect `/verify-email-pending`
3. Verify-E-Mail → kommt an Mobile-Deep-Link `vouchmi://` (siehe BACKEND-TODO.md 🟥)
   — vorerst manuell auf `https://app.vouchmi.com/verify-email?email=…&token=…`
4. Login → Dashboard

### Phase 7 · Aufräumen (optional, später)

- Mittwald-Hostname `app.vouchmi.com` entfernen (Mittwald antwortet dort nicht mehr,
  DNS zeigt auf Vercel — der Hostname ist dead code). Nicht eilig.
- Vercel-Deployment-Branch auf `main` limitieren, Preview-Deployments für PRs erlauben

## Continuous Deployment

Nach dem ersten Setup deployt Vercel automatisch bei jedem Push auf `main`:

- Commit auf `main` → Vercel Build → automatisches Rollout
- Commit auf feature-branch → Vercel Preview-Deployment mit eigener URL

Die CI-Workflow `.github/workflows/portal-ci.yml` läuft parallel zu Vercel und
liefert Typecheck/Lint/Build als GitHub-Check — praktisch für PR-Reviews.

## Rollback

**Wenn das Portal auf Vercel kaputt ist:**

1. Vercel Dashboard → Deployments → letzten funktionierenden Deploy → **Promote to Production**
2. Alternativ: `git revert` auf `main`, Vercel baut neu

**Wenn Vercel komplett down ist (selten):**

1. mStudio → `app.vouchmi.com` als Hostname temporär wieder aktivieren
2. DNS-Record zurück auf Mittwald-IP (A-Record)
3. Laravel antwortet dann wieder direkt unter `app.vouchmi.com` — Mobile-App auf alten Buildstand funktioniert wieder

## ENV-Variablen (alle Umgebungen)

| Variable | Lokal | Vercel (Prod) |
|----------|-------|---------------|
| `BACKEND_URL` | `http://localhost:8000` | `https://api.vouchmi.com` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://app.vouchmi.com` |
| `NEXT_PUBLIC_USE_MOCKS` | optional `true` | `false` |

## Monitoring

- **Vercel Dashboard** → Observability → Logs, Analytics (Requests/s, Error-Rate, Response-Time)
- **Mittwald-Logs** → mStudio → PHP-Error-Log für Laravel-Seite
- **Error-Tracking** (optional): Sentry in Portal + Laravel einbauen — separate Session

## Kosten-Übersicht (Stand heute)

| Service | Tarif | Kosten |
|---------|-------|--------|
| Mittwald Webhosting (für Laravel) | aktueller Tarif bleibt | unverändert |
| Vercel Hobby (für Portal) | Free | 0 € |
| Domain vouchmi.com | beim Registrar | unverändert |
| GitHub (für Repo) | Free | 0 € |

Upgrade auf Vercel Pro (20 USD/Monat) wird erst nötig, wenn Portal > 100 GB
Bandbreite oder mehr Team-Features gewünscht sind. Für Phase 1 nicht nötig.
