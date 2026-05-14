# Runbook: Credits & Boost

> Für Support und Operations. Was tun, wenn ein Nutzer sich meldet oder ein
> Monitoring-Alert feuert. Letztes Update: 2026-05-13.

---

## Schnellzugriff

- **Health-Endpoint** (Grafana): `GET https://api.vouchmi.com/api/internal/credits/health`
  mit Header `Authorization: Bearer $CREDITS_MONITORING_TOKEN`
- **Backoffice-Tabellen**:
  - `wallets` — eine Zeile pro User mit aktuellem Guthaben
  - `wallet_transactions` — vollständiger Audit-Log, alle Buchungen
  - `boosts` — alle Boost-Käufe mit Status + Stats
  - `subscriptions` — Alt-Abos (read-only ab Sunset)
  - `app_store_transactions` — Apple-Audit-Trail
- **Logs**: `apple_iap.*`, `paypal.*`, `wallet.*`, `boost.*` (in Laravel-Log durchgrepbar)
- **Feature-Flag**: `CREDITS_ENABLED` in `.env` — kontrolliert Sichtbarkeit, nicht Code-Pfade

---

## Häufige Support-Fälle

### 1. "Ich habe gezahlt, aber meine Credits sind nicht da"

1. Welche Zahlmethode? Apple (iOS) oder PayPal (Web/Android)?
2. Frage nach: PayPal-Transaction-ID (E-Mail-Beleg) oder Apple-Belegnummer.
3. **PayPal-Pfad**:
   ```sql
   SELECT * FROM wallet_transactions
   WHERE payment_provider = 'paypal' AND provider_ref = '<CAPTURE_ID>';
   ```
   - Eintrag vorhanden mit Status `completed` → Credits sind gebucht, ggf. App
     neustarten lassen oder `GET /api/v1/wallet` cachen-Problem prüfen.
   - Eintrag vorhanden mit Status `reversed` → wurde durch Webhook reversed,
     i.d.R. nach Chargeback oder Dispute. Prüfen ob PayPal-Dispute offen ist.
   - Kein Eintrag → Webhook hat noch nicht gefeuert ODER Capture ist im
     Backend-Log gescheitert. Suche im Log nach `wallet.topup.*`.
4. **Apple-Pfad**:
   ```sql
   SELECT * FROM wallet_transactions
   WHERE payment_provider = 'apple_iap' AND provider_ref = '<TRANSACTION_ID>';
   ```
   - Wenn nicht vorhanden: User soll **App neu öffnen** — StoreKit replayed
     unfinished transactions, der Validate-Call läuft dann durch.
   - Wenn der User die App schon mehrfach geöffnet hat: prüfe das Apple-Log
     im Backend (`apple_iap.validate.rejected` oder `apple_iap.consumable.rejected`).
     Häufigste Ursachen: Sandbox-Transaktion in Produktion oder Bundle-Mismatch.

### 2. "Mein Boost zeigt keine Wirkung"

1. Hole das Boost-Objekt:
   ```sql
   SELECT * FROM boosts WHERE post_id = '<POST_ID>' ORDER BY created_at DESC LIMIT 1;
   ```
2. Status:
   - `active` mit `ends_at` in der Zukunft → Boost läuft korrekt. Check ob der
     User auf seinem eigenen Profil schaut — promoted-Feed filtert eigene Posts raus.
     Im normalen Feed taucht der Post chronologisch auf (mit `is_promoted=true`),
     in `/api/v1/feed/promoted` als geboostete Karte für Follower/Community-Mitglieder.
   - `active` mit `ends_at` in der Vergangenheit → Scheduler ist evtl. nicht
     gelaufen. Prüfe Cron: `php artisan schedule:list` + `boosts:expire` sollte
     alle 5min laufen. Manueller Workaround: `php artisan boosts:expire`.
   - `expired` → läuft nicht mehr, neuer Boost nötig.
   - `refunded` / `cancelled` → User hat selbst gecanceled, oder ein Refund hat ausgelöst.
3. `stats_impressions == 0` nach mehreren Stunden trotz `active`?
   - Plattform-weite Reichweite gerade niedrig (kleine Community, niemand online).
   - Post `is_hidden=true` durch Moderation → Boost läuft, aber Post wird gefiltert.
     Prüfe `posts.is_hidden`. Falls ja: Boost kann via Admin storniert werden
     (siehe Sektion „Admin-Aktionen").

### 3. "Ich habe einen Chargeback gemacht, aber meine Credits sind weg"

So gewollt. Bei PayPal-Dispute oder Apple-Refund läuft der Webhook
(`PAYMENT.CAPTURE.REVERSED` bzw. `REFUND`) und triggert
`WalletService::reverse()`. Falls der User die Credits zwischenzeitlich
ausgegeben hat (Boost gekauft), wird das Wallet auf 0 geclamped und ein
`clawback_shortfall`-Feld in der `metadata`-Spalte gesetzt:

```sql
SELECT id, metadata FROM wallet_transactions
WHERE type = 'reversal'
  AND metadata::text LIKE '%clawback_shortfall%';
```

Mit shortfall > 0 → User hat „kostenlos" geboostet. Optionen:
- Konto sperren bis Differenz beglichen ist.
- Schreiben + freundlich abrechnen.
- Bei Wiederholung: Account-Block via Moderation-Pipeline.

### 4. "Ich will mein Geld zurück"

Standardantwort: Credits sind **nach Gutschrift nicht erstattbar** (siehe AGB
§ 10, Verzicht auf Widerrufsrecht nach § 356 Abs. 5 BGB). Vor jedem Topup
hat der User den Verzicht in der App/im Portal aktiv bestätigt.

Ausnahmen:
- **Doppelt abgebucht** → über Provider erstatten lassen, der Webhook bucht
  Credits automatisch zurück.
- **Technisches Problem** (Backend-Fehler, App-Crash mitten im Kauf, dann
  beide Seiten gebucht) → manuell prüfen, ggf. via Admin-Adjust korrigieren.
- **Apple Family Sharing Issue** → Apple wird bei berechtigter Beschwerde
  refunden, dann reversed unser Webhook automatisch.

Niemals den Refund auf der Vouchmi-Seite manuell auslösen, **bevor** der
Provider tatsächlich gegen uns gebucht hat — sonst doppelter Verlust.

### 5. "Meine Aufladung wurde abgelehnt — 'Aufladegrenze für neue Konten'"

Erwartetes Verhalten: User ist < 30 Tage alt und hat bereits 500 € aufgeladen
(`new_user_topup_cap_cents` und `new_user_window_days` in `config/credits.php`).
Optionen:

- User auf das 31. Konto-Tag warten lassen.
- Bei Verdachtsmoment **prüfen**: gleiche IP, gleicher Device-Fingerprint,
  ähnliche E-Mail wie bereits bekannte Abuse-Konten? Wenn ja: nicht freigeben.
- Bei einem nachvollziehbaren Business-Fall: Limit für genau dieses Konto via
  Admin-Override (siehe unten) anheben.

### 6. "Mein Abo ist abgelaufen, ich habe aber keine Credits bekommen"

Das passiert nur nach Sprint 8 (Sunset). Prüfe:
```sql
SELECT * FROM wallet_transactions
WHERE wallet_id = (SELECT id FROM wallets WHERE user_id = '<USER_ID>')
  AND type = 'migration_bonus';
```

Falls leer: Sunset-Skript ist für diesen User noch nicht gelaufen — manuell
nachholen oder im Backlog flaggen.

---

## Admin-Aktionen

### Manueller Credit-Adjust (Plus oder Minus)

Es gibt aktuell **keine UI** dafür. Über Tinker:

```php
$user = App\Models\User::find('USER_ID');
$wallets = app(App\Services\WalletService::class);
$wallet = $wallets->getOrCreateWallet($user);

// Gutschreiben (z.B. Goodwill, Bug-Kompensation):
$wallets->credit(
    walletOrId: $wallet,
    credits: 500,
    idempotencyKey: 'manual-' . uniqid(),
    meta: [
        'type'             => 'admin_adjust',
        'payment_provider' => 'admin',
        'metadata' => ['reason' => 'goodwill: refund stuck', 'agent' => 'len'],
    ],
);

// Abziehen (z.B. nach Fraud-Detection):
$wallets->debit(
    walletOrId: $wallet,
    credits: 200,
    idempotencyKey: 'manual-' . uniqid(),
    meta: [
        'type'     => 'admin_adjust',
        'metadata' => ['reason' => 'fraud clawback', 'agent' => 'len'],
    ],
);
```

Jede Buchung wird im Audit-Log gespeichert mit `reason` + `agent`.

### Boost-Storno mit Refund (außerhalb des 5min-Fensters)

```php
$boost = App\Models\Boost::find('BOOST_ID');
app(App\Services\BoostService::class)->cancel($boost);
```

Cancel refunded **nur**, wenn `stats_impressions == 0` und innerhalb des
5min-Fensters. Für nachträgliche Goodwill-Refunds: erst `cancel()`, dann
ggf. manuell crediten (siehe oben).

### Verdacht-Konto sperren

Über die Moderation-Pipeline (existiert bereits):
```php
$user = App\Models\User::find('USER_ID');
$user->forceFill(['is_seed' => false, 'role' => 'user'])->save();
// + Block-Eintrag in user_blocks via Moderation-Endpoint
```

Wenn das Konto noch im New-User-Window ist, hindert die Cap-Logik weitere
Topups automatisch — kein zusätzlicher Code nötig.

---

## Monitoring-Alerts

### Alert: `topups_by_provider.paypal.cents_sum` fällt auf 0 für > 15min

Vermutlich PayPal-API erreichbar, aber unsere App schickt nichts. Prüfen:
- `paypal.order.create.failed` Log-Spam?
- PayPal-Status-Page (https://www.paypal-status.com/)
- `paypal.oauth.failed` → Client-Secret rotiert worden?

### Alert: `boost_credits_spent` steigt überproportional zu `topups`

Möglicher Fraud-Loop (Topup → Boost → Refund). Vergleiche `reversal_credits`
mit `topup credits_sum` im selben Window.

### Alert: `transactions.reversal.completed.count` > 5 in 24h

Ungewöhnlich viele Chargebacks. Prüfen ob spezifische Marketing-Aktion einen
unerwarteten User-Strom mitgebracht hat oder ein Bug in der App das
Doppel-Buchen verursacht.

### Alert: `boosts.active_now` > 1000 ohne entsprechendes Topup-Volume

Cache-Multiplier-Bug oder Boost-Endpoint-Idempotency leakt. Sofort
`BoostService::expireDueBoosts()` manuell laufen lassen und Logs prüfen.

---

## Disaster-Szenarien

### "Alle Wallets zeigen 0"

1. Kein Code-Bug — wahrscheinlich Read-Replica-Lag oder Caching-Layer-Outage.
2. Direkt gegen Primary lesen:
   ```sql
   SELECT COUNT(*), SUM(balance_credits) FROM wallets;
   ```
3. Falls Primary OK: App-Layer-Cache invalidieren (Redis FLUSHALL ist
   nuclear — besser gezielt `wallet.*` Keys).

### "Webhook hat Credits gedoppelt"

`wallet_transactions.idempotency_key` und `provider_ref` haben UNIQUE-Constraints
auf DB-Ebene — Doppel-Buchung sollte unmöglich sein. Falls doch:
1. Prüfe ob beide Rows identische `provider_ref` haben. Wenn ja → DB-Constraint
   wurde nicht migriert. Sofort fixen.
2. Wenn unterschiedliche `provider_ref` → Provider hat zwei verschiedene Capture-IDs
   geschickt, evtl. legitim (zweiter Kauf). Audit-Trail durchgehen.

### "Apple lehnt unseren App-Build wegen IAP-Regeln ab"

Standard-Frage: bewerben wir Boosts (digitales Gut) auf iOS und führen den
Kauf über etwas anderes als Apple IAP? Wenn ja → unzulässig.

Quick-Check:
- Wallet-Screen auf iOS muss `iapBuyConsumable()` nutzen, **nicht** den
  PayPal-WebBrowser.
- `app/wallet.tsx`: `handleTopup` schaltet auf `useIap` um — wenn das nicht
  feuert, ist Apple-Pfad nicht aktiv und Apple lehnt ab.

---

## Onboarding-Checkliste neue Support-Mitarbeitende

- [ ] Zugang zu Backend-Logs (Mittwald-Server, Laravel-Log)
- [ ] Zugang zu DB via SSH-Tunnel (read-only User)
- [ ] Zugang zu `tinker` via Production-Konsole (nur für L2-Support)
- [ ] Grafana-Login mit Credits-Dashboard
- [ ] PayPal-Merchant-Dashboard mit Zugriff auf Disputes
- [ ] App Store Connect mit Rolle „Customer Support"
- [ ] Dieses Runbook gelesen + Quick-Test mit einem Sandbox-Topup durchgespielt
