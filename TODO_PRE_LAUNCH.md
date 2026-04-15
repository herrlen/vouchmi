# Vouchmi — Offene Punkte vor Live-Gang

Stand: 2026-04-15. Pflege diese Liste, wenn neue Dinge auftauchen.

## Phase 2 — WhatsApp 2FA für Influencer

**Blocker:** Meta WhatsApp Business Cloud API Credentials.

Benötigt vor Umsetzung:
- Verifizierte Meta Business App mit `WHATSAPP_PHONE_NUMBER_ID`
- Freigeschaltetes OTP-Template `otp_authentication` (Meta prüft das ~2 Werktage)
- Dauerhaften `WHATSAPP_ACCESS_TOKEN` (System-User-Token, keine kurzlebigen User-Tokens)
- Fallback-Strategie falls WhatsApp nicht erreichbar ist (SMS? E-Mail-OTP?)

Umzusetzen:
- Migration `otp_codes` (id, user_uuid, code_hash, expires_at, verified_at, created_at)
- `App\Services\WhatsAppOtpService` (Meta Cloud API via Guzzle)
- `POST /auth/send-otp` — generiert 6-stelligen Code, hashed speichert, sendet via WA
- `POST /auth/verify-otp` — validiert, setzt `users.phone_verified_at`
- Frontend-Screen `app/verify-phone.tsx` mit Resend-Cooldown und 6-Input-Feldern
- Weiterleitung: nach E-Mail-Verify für Influencer **statt** direkt zu `/reco`
- `.env.example` um `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN` ergänzen

## Phase 3 — Architektur-Refactoring (nicht zwingend vor Live)

### 3a. API-Versionierung `/api/v1/*`

Aktuell: ~80 Routes unter `/api/*`. Frontend + Test-User nutzen sie.

Umzustellen auf `/api/v1/*`:
- `backend/routes/api.php` — alle Routes in `Route::prefix('v1')->group(…)` wickeln
- `src/lib/api.ts` — Base-URL anpassen oder alle Pfade mit `/v1` prefixen
- `.env` (App + Server) — `EXPO_PUBLIC_API_URL=https://app.vouchmi.com/api/v1`
- Mail-Reset-Link + PayPal-Callback-URLs im Backend ebenfalls

Lohnt sich erst, wenn eine **breaking change** ansteht und man gleichzeitig `v2` braucht.

### 3b. PayPal: eigener Service → `srmklive/paypal` Package

Aktuell: `App\Services\PayPalService` (130 Zeilen), deckt `createSubscription`, `cancel`,
`getSubscription`, Webhook-Handling. Funktioniert live getestet im Stub-Modus.

`srmklive/paypal` würde zusätzlich bringen:
- Invoicing, Payouts, Orders API (brauchen wir *nicht*)
- Webhook-Signature-Verifikation out-of-the-box (**das** wäre der echte Mehrwert)

Entscheidung: erst tauschen, wenn wir Signature-Verifikation wirklich brauchen
oder Invoicing für Brand-Rechnungen einführen.

### 3c. User-Schema-Umbau: `name`/`company_name`/`paypal_email` auf `users`

Aktuell:
- `users.display_name` (statt `name`)
- `brand_profiles.brand_name`, `paypal_email`, `company_email`

Der Web-Prototyp erwartet die Felder direkt auf `users`. Wenn wir BrandProfile
als separaten Datensatz behalten wollen (wegen Slug, Logo, Cover, Industry,
Drops/Seeding-Beziehungen), **bleibt der aktuelle Aufbau richtig** — nur der
Mapper in der App muss `status.brand?.brand_name` → "Firmenname" etc. lesen,
was er schon tut.

Nur umbauen, wenn BrandProfile gelöscht wird (und damit Drops/Seeding).

## Go-Live-Pflichten (unabhängig von obigem)

- [ ] PayPal Live-Credentials eintragen (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`,
      `PAYPAL_PLAN_ID`, `PAYPAL_WEBHOOK_ID` in Server-`.env`)
- [ ] PayPal-Webhook auf `https://app.vouchmi.com/api/webhooks/paypal` registrieren
      (Events: `BILLING.SUBSCRIPTION.ACTIVATED/CANCELLED/EXPIRED/SUSPENDED`)
- [ ] DSGVO-Texte (Datenschutz/AGB in `LegalController`) anwaltlich prüfen lassen
- [ ] App Store Privacy Manifest auf Meldung von Kontaktzugriff / Foto-Upload
      prüfen (siehe `app.config.ts` → `NSPrivacyAccessedAPITypes`)
- [ ] Apple-Pflicht: Account-Löschung sichtbar im Profil (bereits vorhanden,
      nur visuelles Redesign falls gewünscht)
- [ ] SPF/DKIM/DMARC für `vouchmi.com` setzen, damit Mails nicht im Spam landen
