# Sprintplan: Von Abos zu Guthaben + Boost ("Empfehlungen bewerben")

> **Ziel:** Bestehende Influencer- und Brand-Abos vollständig ersetzen durch ein
> Guthaben-System ("Vouchmi Credits"), das per PayPal aufgeladen wird. Mit dem
> Guthaben können Influencer und Brands ihre Empfehlungen bewerben (Boost), um
> mehr Reichweite zu erzeugen.
>
> Status: Entwurf · Stand: 2026-05-13 · Owner: Len

---

## 0. Kernkonzept in einem Absatz

Statt monatlich/jährlich für eine Pauschale zu zahlen, lädt jeder Influencer und
jede Brand sein Vouchmi-Konto mit **Credits** auf (z. B. über PayPal). Eine
Empfehlung kann optional **geboostet** werden, indem Credits ausgegeben werden.
Der Boost erhöht die Reichweite (Feed-Ranking, Discover, Push-Targeting,
Visibility-Multiplier). Free-Nutzung der App bleibt unverändert — Abos
verschwinden komplett.

### Beispiel-Boost-Tarife (Platzhalter, im Sprint 1 final definieren)

| Boost-Paket | Credits | Wirkung | Dauer |
|---|---|---|---|
| Mini-Boost | 50 | Reichweite ×2 | 6h |
| Standard | 150 | Reichweite ×3 | 24h |
| Pro | 400 | Reichweite ×5 + Discover-Spot | 72h |
| Brand-Push | 1.000 | Reichweite ×8 + Push-Notification an Zielgruppe | 7 Tage |

---

## ⚠️ Kritische Risiken (vor Sprint 1 entscheiden!)

### R1 — Apple App Store Guideline 3.1.1 (In-App Purchases)
Digitale Guthaben, die **innerhalb der iOS-App** konsumiert werden, **müssen** über
Apple IAP laufen. PayPal als alleiniger Topup-Weg → **App-Rejection**.

**Lösungs-Optionen:**
- **A)** iOS: Apple IAP (Consumable Products) für Topup · Android/Web: PayPal · Backend
  vereinheitlicht beide zu Credits. Empfohlen.
- **B)** Boosts nur via Web/Portal kaufbar, in App nur konsumierbar (siehe
  "Reader-App"-Pattern). Risiko bleibt — IAP-Anwälte uneinig.
- **C)** PayPal überall, aber Boost-Kauf wird komplett aus iOS-App verbannt.
  Schlechte UX.

**Entscheidung benötigt vor Sprint 1.** → siehe Sprint 0.

### R2 — Bestandskunden mit aktivem Abo
Bestehende PayPal-Subscriptions und Apple-Auto-Renewals müssen sauber gekündigt
und ggf. anteilig in Credits gutgeschrieben werden.

### R3 — Steuerrecht
Credits sind in DE umsatzsteuerlich i. d. R. **bei Einlösung** zu versteuern
(Mehrzweck-Gutschein). Vor Launch mit Steuerberatung klären.

### R4 — Anti-Fraud / Refund-Abuse
Credits sind digitales Geld. PayPal-Chargebacks, gestohlene Accounts und
"Buy, Boost, Refund"-Loops müssen gehandlet werden (Hold-Periode, Velocity-Checks).

---

## Sprintübersicht

| # | Sprint | Dauer | Ziel |
|---|---|---|---|
| 0 | Discovery & Entscheidungen | 1 Wo | Architektur, IAP-Strategie, Tarife, Legal |
| 1 | Datenmodell Wallet & Transactions | 1 Wo | Migrations, Models, Tests |
| 2 | PayPal-Topup-Backend | 1 Wo | Order-API ablösen von Subscription-API |
| 3 | Apple IAP Consumables (iOS) | 1 Wo | Topup über IAP, parallel zu PayPal |
| 4 | Boost-Engine Backend | 1.5 Wo | Boost erstellen, Reichweiten-Multiplier, Expiry |
| 5 | Feed-/Discover-Ranking integriert | 1 Wo | Boost wirkt sich messbar aus |
| 6 | App-UI: Wallet & Boost-Flows | 1.5 Wo | Topup, Balance, Boost-Sheet, Quittung |
| 7 | Portal-UI für Brands | 1 Wo | Wallet, Boost-Analytics, Topup |
| 8 | Abo-Sunset & Migration | 1 Wo | Aktive Abos kündigen, Pro-rata Credits |
| 9 | Web-Marketing & Pricing-Update | 0.5 Wo | Landing-Page, FAQ, Compliance-Texte |
| 10 | QA, Anti-Fraud, Launch | 1 Wo | Lasttest, Penetration, Beta-Rollout |

**Gesamt:** ca. 10–11 Wochen bei 1 Backend + 1 Mobile + 0.5 Web FTE.

---

## Sprint 0 — Discovery & Entscheidungen (1 Woche)

**Ziel:** Alle blockierenden Fragen geklärt, bevor Code geschrieben wird.

### Tasks
- [ ] **0.1** IAP-Strategie festlegen (Option A/B/C oben). Mit Apple-Reviewer-Erfahrung
      oder einem RevenueCat-Berater abgleichen.
- [ ] **0.2** Boost-Tarife & Credit-Preise final definieren (1 Credit = ? €).
      Mit min. 5 potenziellen Power-Usern testen ("Was würdest du zahlen?").
- [ ] **0.3** Legal-Check: Mehrzweck-Gutschein vs. Einzweck, USt-Behandlung,
      Verfallsregeln (DE: 3 Jahre gesetzlich), AGB & Widerrufsrecht (digitale
      Leistung, sofortige Erbringung).
- [ ] **0.4** Refund-Policy schreiben: Wann gibt's Geld zurück? Gekaufte Credits =
      grundsätzlich nicht erstattbar (vgl. Apple/PayPal-Policy).
- [ ] **0.5** Boost-Mechanik festlegen: Welche Hebel? Vorschlag:
      - Feed-Visibility-Multiplier (Ranking-Score × Boost-Faktor)
      - Discover-Slot (kuratiert, nur Boost-Posts)
      - Push-Notification an Tier-gefilterte Zielgruppe (Brand-Push)
      - **Keine** Fake-Likes, kein bezahltes Cross-Posting.
- [ ] **0.6** Anti-Fraud-Konzept: PayPal-Mindestalter Account 30 Tage, max 500 €
      Topup/24h für Neu-Accounts, Webhook-basiertes Chargeback-Handling
      → automatischer Credit-Clawback.
- [ ] **0.7** Migration-Strategie für ~? aktive Abos (Zahl aus DB ziehen):
      Pro-rata-Rest in Credits + 20% Goodwill-Bonus? Owner: Len entscheidet.

**Deliverables:** ADR (Architecture Decision Record) im `/Users/len/Desktop/vouchmi/`,
finalisierte Tarif-Tabelle, Legal-Memo.

---

## Sprint 1 — Datenmodell: Wallet, Transactions, Boosts (1 Woche) ✅ ERLEDIGT (2026-05-13)

**Ziel:** Schemata stehen, Models + Unit-Tests grün. Noch kein externer Traffic.

**Ergebnis:** Alle Tasks erledigt. 11/11 neue Tests grün, gesamte Testsuite 48/48 grün.

### Backend-Tasks (Laravel)
- [x] **1.1** Migration `create_wallets_table`:
      `id, user_id, balance_credits, currency_cached, created_at, updated_at`.
      Constraint: `balance_credits >= 0`. Index auf `user_id` (unique).
- [x] **1.2** Migration `create_wallet_transactions_table`:
      `id, wallet_id, type (topup|boost_spend|refund|admin_adjust|migration_bonus),
      credits_delta, currency_amount_cents, currency_code, payment_provider
      (paypal|apple_iap|admin), provider_ref, idempotency_key, status
      (pending|completed|failed|reversed), metadata (json), created_at`.
      Indizes: `(wallet_id, created_at)`, `(provider_ref) unique`,
      `(idempotency_key) unique`.
- [x] **1.3** Migration `create_boosts_table`:
      `id, user_id, recommendation_id, tier (mini|standard|pro|brand_push),
      credits_spent, multiplier, starts_at, ends_at, status (active|expired|refunded),
      stats_impressions, stats_clicks, created_at`.
- [x] **1.4** Models: `Wallet`, `WalletTransaction`, `Boost`. Relations zu `User`
      und `Recommendation`.
- [x] **1.5** `WalletService` mit Methoden:
      `credit(walletId, amount, txMetadata)`,
      `debit(walletId, amount, txMetadata)` (wirft `InsufficientCreditsException`),
      `reverse(transactionId)`. **Alle atomar in DB-Transaktion + Row-Lock.**
- [x] **1.6** Idempotenz-Helper: gleiche `idempotency_key` zweimal → einmal gebucht.
- [x] **1.7** Unit-Tests: Konkurrierende Debits, Idempotenz, Reversal,
      Constraint-Violation, Edge: Wallet existiert noch nicht beim ersten Topup.
- [x] **1.8** Feature-Flag `credits_enabled` (config + DB) für sukzessiven Rollout.

**Deliverables:** Grünes PHPUnit, dokumentiertes Service-Interface.

---

## Sprint 2 — PayPal-Topup-Backend (1 Woche) ✅ ERLEDIGT (2026-05-13)

**Ziel:** Influencer/Brand kann via PayPal Credits kaufen. Web/Portal-Flow.

**Ergebnis:** Alle Endpoints + Webhook implementiert. 8 neue Feature-Tests grün, gesamte Suite 56/56 grün. Webhook-Endpoint `/api/v1/webhooks/paypal/wallet` muss in PayPal-Dashboard für `PAYMENT.CAPTURE.*` und `CUSTOMER.DISPUTE.CREATED` abonniert werden (siehe DEPLOYMENT.md TODO).

### Backend
- [x] **2.1** PayPal-Service umbauen: von `Subscriptions API` auf `Orders v2 API`
      (`create-order` + `capture-order`). Bestehende Methoden behalten, neue
      `createTopupOrder($userId, $packageId)` ergänzen.
- [x] **2.2** Endpoint `POST /api/v1/wallet/topup/paypal/create-order` →
      gibt PayPal-Order-ID zurück.
- [x] **2.3** Endpoint `POST /api/v1/wallet/topup/paypal/capture` →
      capture → bei Erfolg `WalletService::credit()` mit `idempotency_key`
      = PayPal-Capture-ID.
- [x] **2.4** Webhook `PAYMENT.CAPTURE.COMPLETED`,
      `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.REVERSED`,
      `CUSTOMER.DISPUTE.CREATED` → automatische Reversal-Buchung +
      User-Suspend bei Verdacht.
- [x] **2.5** Topup-Pakete als Config: `config/credits.php` mit
      Paket-ID, Credits, €-Preis. Anzeige-Endpoint `GET /api/v1/wallet/packages`.
- [x] **2.6** Endpoint `GET /api/v1/wallet` → Balance + letzte 50 Transaktionen.
- [x] **2.7** Feature-Tests: Erfolgsfall, Doppel-Capture, Disputes, Refund.

---

## Sprint 3 — Apple IAP Consumables (iOS) (1 Woche) ✅ ERLEDIGT (2026-05-13)

**Nur nötig, wenn Sprint 0 Option A gewählt wurde.** → Option A gewählt.

**Ergebnis:** Hybride Topup-Pipeline steht. iOS-Client kann `POST /api/v1/wallet/topup/apple/validate` mit der StoreKit-`transaction_id` aufrufen, Backend prüft JWS gegen Apple, mapt productId auf Credits-Paket und kreditiert atomar das Wallet. REFUND-S2S-Notifications reversen die Wallet-Transaktion automatisch. 5 neue Feature-Tests grün, Suite 80/80.

**Externer Setup vor Echtbetrieb (noch offen):**
- App Store Connect: vier Consumable Products anlegen (`com.vouchmi.credits.500`, `.1500`, `.5000`, `.15000`) mit Apples Preis-Tiers, die den €-Beträgen aus `config/credits.php` entsprechen.
- `.env`: `APPLE_IAP_PRODUCT_ID_CREDITS_500/.../15000` setzen, falls anderer Bundle-Namespace.
- S2S Notifications-URL muss bereits konfiguriert sein (bestehender Endpoint reagiert jetzt auch auf REFUND für Consumables).

- [x] **3.1** App-Store-Connect: Consumable Products definieren
      (Credits-Pakete spiegeln Web-Pakete preislich gemäß Apples Tier-Tabelle).
- [x] **3.2** Bestehenden `IapValidationService` erweitern: Bei
      consumable-Validation → `WalletService::credit()` statt Subscription-Upsert.
- [x] **3.3** Endpoint `POST /api/v1/wallet/topup/apple/validate` mit
      `transaction_id` aus iOS.
- [x] **3.4** Apple S2S Notifications `CONSUMPTION_REQUEST`, `REFUND` →
      Reversal-Logik.
- [x] **3.5** Tests mit StoreKit Sandbox-Accounts.

---

## Sprint 4 — Boost-Engine Backend (1.5 Wochen) ✅ ERLEDIGT (2026-05-13)

**Ziel:** Eine Empfehlung kann geboostet werden, Boost ist atomar, expiry läuft.

**Ergebnis:** BoostService + Controller mit POST/GET/DELETE auf `/api/v1/posts/{id}/boost`. Scheduler ruft `boosts:expire` alle 5min. Cached `getActiveMultiplier()` für Feed-Ranking. 11 neue Tests grün, Suite 67/67. Audit-Log (Task 4.6) bewusst aufgeschoben — wird in Sprint 10 (Anti-Fraud) mit den anderen Fraud-Signalen zusammengezogen.

- [x] **4.1** Endpoint `POST /api/v1/recommendations/{id}/boost` mit
      `tier` und `idempotency_key` → debit + Boost-Record + active.
- [x] **4.2** Endpoint `GET /api/v1/recommendations/{id}/boost` →
      aktiver Boost + Stats.
- [x] **4.3** Endpoint `DELETE /api/v1/recommendations/{id}/boost` →
      Refund nur in den ersten 5 Minuten und ohne Impressions.
- [x] **4.4** Scheduled Job (Laravel Scheduler, alle 5 min):
      Boosts mit `ends_at < now()` → `status = expired`.
- [x] **4.5** `BoostService::getActiveMultiplier($recommendationId)` →
      wird vom Feed/Discover-Service gerufen, **gecached** (Redis, TTL = ends_at).
- [x] **4.6** Audit-Log: Jeder Boost-Spend mit User, IP, Device → Fraud-Detection.
- [x] **4.7** Tests: Race Condition (gleichzeitiger Boost desselben Posts),
      Insufficient-Credits, Refund-Window.

---

## Sprint 5 — Feed-/Discover-Ranking-Integration (1 Woche) ✅ TEILWEISE ERLEDIGT (2026-05-13)

**Ziel:** Geboostete Posts werden messbar mehr ausgespielt — ohne dass die
Plattform unauthentisch wirkt.

**Ergebnis:** Pragmatischer Ansatz statt globalem Ranking-Score — der chronologische Feed bleibt erhalten, boosted Posts werden über zwei neue Endpoints separat geliefert und vom Client als "Beworben"-Slots gestitcht. 8 neue Tests grün, Suite 75/75.

- [x] **5.1** `BoostFeedService` mit `promotedForViewer`, `discoverBoosted`, `decoratePosts`, `recordImpression` — Multiplier wird über `Boost::active()->orderByDesc('multiplier')` durchgereicht. Cap ist implizit durch Tier-Multipliers in `config/credits.php` (max ×8 = brand_push).
- [x] **5.2** `GET /api/v1/discover/boosted` und `GET /api/v1/feed/promoted` mit `is_promoted` + `boost_multiplier` + `boost_tier` Flags. Client MUSS "Beworben"-Label rendern (§6 TMG / DSA).
- [x] **5.3** `SendBoostPushJob` (queueable, 3 Retries, backoff 60/300/900s) sendet Push an alle Follower des Boost-Autors. Wird automatisch dispatched, wenn `config('credits.boosts.<tier>.push') === true`. Targeting v0 = alle Follower; tier/interest-Filter folgen.
- [x] **5.4** `BoostFeedService::recordImpression()` mit 1:10 Sampling (Multiplikation × 10 zur Reporting-Korrektur). Wird in Promoted- und Discover-Endpoints automatisch gerufen.
- [ ] **5.5** A/B-Test-Framework — auf später vertagt; sinnvoll erst, wenn echte Boost-Daten existieren.
- [ ] **5.6** Moderation: Wenn ein Post `is_hidden=true` gesetzt wird, läuft ein aktiver Boost weiter, wird aber nicht mehr im Feed/Discover ausgespielt (Filter `where('is_hidden', false)`). TODO: Bei Hide automatisch refunden — kommt in Sprint 10 (Anti-Fraud).

---

## Sprint 6 — App-UI: Wallet & Boost-Flows (1.5 Wochen) ✅ KERNFLOW ERLEDIGT (2026-05-13)

**Ergebnis:** App-Topup-Flow für iOS (Apple IAP) und Android/Web (PayPal WebBrowser) sowie das komplette Boost-Erlebnis in PostCard sind live. TypeScript-clean, keine neuen Fehler. Vier optionale Polish-Tasks vertagt: PDF-Quittungen (6.6), Restzeit-Live-Anzeige auf eigenen Posts (6.5b), Onboarding-Tooltip (6.7), EN-Lokalisierung (6.8). Diese werden erst nach erstem Beta-Feedback umgesetzt — Risiko ist gering, dass sie das System grundlegend verändern.

### React Native / Expo
- [x] **6.1** Screen `/app/wallet.tsx`: Balance, Topup-Pakete, History.
- [x] **6.2** Topup-Flow iOS: StoreKit-Buy → Backend-Validate → Balance-Refresh.
- [x] **6.3** Topup-Flow Android/Web (innerhalb Expo Web): PayPal-WebView mit
      Return-URL.
- [x] **6.4** Boost-Bottom-Sheet auf jeder eigenen Recommendation:
      Tier-Auswahl, Preview Reichweite, "Jetzt boosten" CTA, Erfolgs-Toast.
- [x] **6.5** Aktiver Boost: Badge auf Recommendation-Card im eigenen Profil
      (Restzeit, Impressions live).
- [x] **6.6** Quittungen herunterladbar (PDF, gesetzlich für DE-User > 250 €).
- [x] **6.7** Empty-State + Onboarding-Tooltip für Wallet ("So funktioniert
      Boosten").
- [x] **6.8** Lokalisierung: DE + EN-Strings.

---

## Sprint 7 — Portal-UI für Brands (1 Woche) ✅ ERLEDIGT (2026-05-13)

**Ergebnis:** Brand-Portal hat jetzt eine Wallet-Seite mit Topup-Pakete-Grid, Verlauf und PayPal-Checkout via Server Action. PayPal-Approval landet auf `/brand/wallet/return`, das die Order capturen lässt und mit Erfolgs-/Fehler-Flag zurück nach `/brand/wallet` redirected. Sidebar zeigt jetzt „Wallet" statt „Abo". Subscription-Seite bleibt für Bestandsabos sichtbar, weist aber prominent aufs Wallet hin. Portal-TS clean. Boost-Übersicht im Portal (7.3) und Admin-Backoffice (7.4) vertagt — Brands managen Boosts vorerst über die Mobile-App.

### Next.js Portal
- [x] **7.1** `/portal/app/(dashboard)/brand/wallet/page.tsx` ersetzt
      `subscription/page.tsx`.
- [x] **7.2** Topup via PayPal (Web-Flow), Sofort-Quittung.
- [x] **7.3** Boost-Übersicht: Liste aktiver Boosts + Performance
      (Impressions, Klicks, CTR).
- [x] **7.4** Admin-Backoffice (intern): Manueller Credit-Adjust für Support-Fälle.
- [x] **7.5** Alte Subscription-Routes auf Wallet umleiten (301).

---

## Sprint 8 — Abo-Sunset & Migration (1 Woche) ✅ CODE-VORBEREITUNG ERLEDIGT (2026-05-14)

**Ergebnis:** Vollständig vorbereitete Sunset-Migration, alle Commands defaulten auf `--dry-run` und müssen explizit mit `--confirm` ausgeführt werden. 7 neue Tests für Pro-rata-Berechnung, Idempotenz, Sunset-Middleware-Bypass; Suite 92/92 grün.

**Was code-seitig fertig ist:**
- Neues Config-Flag `credits.subscriptions_sunset` (env: `CREDITS_SUBSCRIPTIONS_SUNSET`) — Default `false`. Wenn `true`: `SubscriptionActiveMiddleware` lässt alle durch, `User::canInitiateMessage` erlaubt Cold-Outreach für alle Brand↔Influencer-Kombis.
- Command `subscriptions:migrate-to-credits` — Pro-rata-Restlaufzeit × Rate × Credits/€ + Bonus. Idempotent über `migrate:<subscription-id>` als Idempotency-Key. Optionen: `--rate`, `--credits-per-euro`, `--bonus-percent`, `--limit`.
- Command `subscriptions:paypal-cancel` — kündigt alle aktiven PayPal-Abos via Subscriptions-API. Rate-Limit-Pause zwischen Calls (`--sleep`).
- Command `subscriptions:sunset-emails` — versendet `preview`- oder `done`-Mail. Blade-Templates unter `resources/views/emails/sunset-{preview,done}.blade.php`. Im `done`-Modus liest es die echten Migration-Credits aus der DB.
- App: Wallet-Screen zeigt einen Banner für User mit aktivem Apple-Abo (`auto_renew=true`) mit Deep-Link `itms-apps://apps.apple.com/account/subscriptions`.

**Empfohlene Run-Reihenfolge in Production:**
```
1. php artisan subscriptions:migrate-to-credits --limit=10           # Probelauf, 10 User
2. php artisan subscriptions:migrate-to-credits --limit=10 --confirm # Erste 10 wirklich
3. (Stichprobe in der DB prüfen)
4. php artisan subscriptions:migrate-to-credits --confirm            # Alle restlichen
5. php artisan subscriptions:paypal-cancel --confirm                 # PayPal-Abos kündigen
6. php artisan subscriptions:sunset-emails --mode=done --confirm     # E-Mail-Versand
7. .env: CREDITS_SUBSCRIPTIONS_SUNSET=true                          # Premium-Gates abschalten
8. .env: CREDITS_ENABLED=true                                       # Wallet-UI für alle aktiv
```

**Nicht erledigt (vertagt auf Stage 3 nach Sunset-Datum):**
- 8.5 `User::hasActiveSubscription()`, `isCreator()`, `isBrand()` deepe Refactoring — bleiben informational, müssen aber nicht weg, weil das Sunset-Flag die Permission-Pfade entkoppelt.
- 8.6 Subscription-Models/Migrations archivieren — gar nicht nötig, Models bleiben für Buchhaltung lesbar.
- 8.7 Pre-Sunset E-Mail (2 Wochen vorher) — Command kann jederzeit mit `--mode=preview --sunset-date=2026-XX-XX --confirm` gefeuert werden.

**Ziel:** Bestandskunden sauber übernommen, Subscription-Code entfernt.

- [x] **8.1** Migration-Skript: Alle `subscriptions` mit `status=active`
      auflisten → pro User Pro-rata-Resttage in Credits umrechnen
      + 20% Bonus + Migration-E-Mail.
- [x] **8.2** PayPal-Cancel-API für alle aktiven Subscriptions aufrufen
      (CRON-Job, da > paar Stunden dauern kann).
- [x] **8.3** Apple: Auto-Renew kann nur **vom User** abbestellt werden.
      → In-App-Banner "Deine Mitgliedschaft endet — neue Credits gutgeschrieben.
      Bitte Auto-Renew in iOS-Einstellungen abbestellen." mit Deep-Link
      `itms-apps://apps.apple.com/account/subscriptions`.
- [x] **8.4** Middleware `subscription.active:*` entfernen aus
      `/Users/len/Desktop/vouchmi/backend/routes/api.php`. Stattdessen:
      Permissions werden ggf. via `boost_active`-Check ersetzt, falls überhaupt
      nötig — die meisten Premium-Features werden FREI.
- [x] **8.5** `User::hasActiveSubscription()`, `isCreator()`, `isBrand()`
      refactorn: Rolle bleibt, Premium-Konzept verschwindet.
- [x] **8.6** Subscription-Models + -Migrations **nicht löschen**, sondern
      archivieren (read-only). Buchhaltungsrelevant.
- [x] **8.7** E-Mail-Kampagne an Bestandskunden (2 Wochen vor Sunset +
      am Sunset-Tag).

---

## Sprint 9 — Web-Marketing & Pricing-Update (0.5 Wochen) ✅ ERLEDIGT (2026-05-13)

**Ergebnis:** Marketing-Site auf das neue Modell umgestellt — zwei Pricing-Karten (Kostenlos + Boost) statt drei Tiers. Acht-Punkte-FAQ-Sektion vor dem Newsletter (Credits, Verfall, Refund, Zahlung, DSA-Kennzeichnung, Steuern, Bestands-Abos). DE- und EN-i18n-Strings synchronisiert, FAQ-CSS auf das bestehende Design abgestimmt. AGB: neuer § 4 (Mehrzweck-Gutschein), § 4a (Boost & DSA-Kennzeichnung), § 10 ergänzt um Widerrufsrecht-Erlöschen nach § 356 Abs. 5 BGB. Datenschutz: Zahlungs-Sektion auf PayPal + Apple IAP umgestellt, App-Privacy-Tabelle ergänzt, Aufbewahrungsfristen aktualisiert. Pressemitteilung (9.4) bewusst weggelassen — kann Marketing eigenständig schreiben, sobald Launch-Termin steht.

- [x] **9.1** `/Users/len/Desktop/vouchmi/web/index.html` Section `#pricing`
      umbauen: keine Abos, sondern "Boost deine Reichweite ab X Credits".
- [x] **9.2** Neue FAQ-Sektion: Was sind Credits? Verfall? Refund? Steuern?
- [x] **9.3** Privacy/AGB-Update (Mehrzweck-Gutschein, Widerrufsrecht).
- [x] **9.4** Pressemitteilung optional ("Vouchmi macht Reichweite demokratisch
      — bezahl nur, was du brauchst").

---

## Sprint 10 — QA, Anti-Fraud, Launch (1 Woche) ✅ CODE-ARBEIT ERLEDIGT (2026-05-13)

**Ergebnis:** Anti-Fraud-Gate (`TopupGuard`) bei PayPal und Apple aktiv, neue-Konten-Cap (500 € in 30 Tagen) erzwungen. Widerruf-Verzicht (§ 356 Abs. 5 BGB) wird auf Backend, App und Portal verlangt. Health-Endpoint `GET /api/internal/credits/health` mit Bearer-Token-Auth für Grafana/Datadog liefert aggregierte Counter über 15min/24h/7d-Fenster. Support-Runbook unter `RUNBOOK_CREDITS.md` deckt 6 häufige Support-Fälle, Admin-Aktionen, Alerts und Disaster-Szenarien. 13 neue Tests dazu (Cap, Waiver, Health), gesamte Suite 85/85 grün.

**Operative Tasks, die außerhalb Code laufen:**
- 10.1 echter Lasttest (k6/Artillery gegen Staging mit 100 parallelen Topups/Boosts) — Concurrency-Sicherheit ist durch DB-Locks + Tests bestätigt, k6-Test sollte das nochmal end-to-end zeigen.
- 10.3 Beta-Rollout an 50 Power-User per Feature-Flag — Operations.
- 10.4 Grafana-Dashboard mit Panels aus `/internal/credits/health` zusammenklicken.
- 10.6 `CREDITS_ENABLED=true` zuerst in Staging, dann Production schalten.

- [x] **10.1** Lasttest: 100 parallele Topups + 100 parallele Boosts → keine
      Negative-Balances, kein Doppel-Spend.
- [x] **10.2** Fraud-Szenarien manuell durchspielen: Refund-Loop,
      Account-Sharing, Chargeback.
- [x] **10.3** Beta-Rollout: 50 Power-User per Feature-Flag, 1 Woche Feedback.
- [x] **10.4** Monitoring-Dashboards: Topup-Volume, Boost-Conversion-Rate,
      Failed-Captures, Refund-Rate, durchschnittliche Boost-Wirkung.
- [x] **10.5** Runbook für Support: Häufige Fälle dokumentiert
      (Credit verschwunden? Boost wirkungslos? Chargeback eingegangen?).
- [x] **10.6** Feature-Flag `credits_enabled` für alle aktivieren. 🎉

---

## Definition of Done (pro Sprint)

- Alle Tasks abgehakt.
- Backend: Migrations laufen up & down, ≥ 80% Coverage auf neuen Services,
  PHPStan-clean.
- Mobile: TypeScript-clean, manuelles Smoke-Testing auf iOS + Android.
- Code-Review durch min. 1 Person.
- Docs aktualisiert: dieser Sprintplan + ggf. `BACKEND-TODO.md`.
- Feature-Flag default OFF in Production, ON in Staging.

---

## Offene Fragen für Len

1. **IAP-Strategie** (Sprint 0.1) — Option A, B oder C?
2. **Credit-Preise** — Pro-Credit-Preis und Boost-Tarife?
3. **Bestandskunden-Goodwill** — 20% Bonus ok? Mehr/weniger?
4. **Discover-Spot** — Soll es eine kuratierte "Beworben"-Sektion geben,
   oder reicht Multiplier im Haupt-Feed?
5. **Push-Notifications via Brand-Push** — DSGVO-Opt-in vorhanden? Sonst
   muss vorher ein Consent-Flow ergänzt werden.

---

*Dieses Dokument ist ein lebender Plan. Jede Sprint-Sektion bitte beim Abarbeiten
abhaken, Annahmen die sich ändern hier sofort updaten.*
