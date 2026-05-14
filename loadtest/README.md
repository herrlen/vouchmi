# Loadtests

## Setup

```bash
brew install k6   # macOS
# oder: https://k6.io/docs/get-started/installation/
```

## Sanctum-Token besorgen

```bash
# Login gegen Staging:
curl -X POST https://staging-api.vouchmi.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"loadtest@vouchmi.com","password":"..."}' \
  | jq -r .token
```

## Tests laufen

```bash
# Smoke (5 VUs · 1 min) — Sanity-Check
k6 run --env API=https://staging-api.vouchmi.com --env TOKEN=$TOKEN loadtest/credits.js

# Ramp (50 VUs · 3.5 min) — Production-realistisch
k6 run --env STAGES=ramp --env TOKEN=$TOKEN loadtest/credits.js

# Spike (100 VUs · 50 s) — Worst Case
k6 run --env STAGES=spike --env TOKEN=$TOKEN loadtest/credits.js

# Soak (30 VUs · 35 min) — Long Run, deckt Memory-Leaks auf
k6 run --env STAGES=soak --env TOKEN=$TOKEN loadtest/credits.js
```

## Erfolgskriterien

- `http_req_failed < 1 %`
- `http_req_duration p(95) < 400 ms`
- `errors rate < 1 %`

Falls Schwellen reißen: in der k6-Konsole nach `THRESHOLD` greppen.
Im Backend gleichzeitig `tail -f storage/logs/laravel.log` und Grafana-Dashboard
beobachten, um den Engpass zu lokalisieren.

## Was wird NICHT getestet

- Echte PayPal-/Apple-Topups — die brauchen Provider-Sandboxes, nicht Load
- DB-Locking unter parallelen Topups → ist durch PHPUnit-Tests abgedeckt
  (`WalletServiceTest::test_credit_is_idempotent_on_idempotency_key` u.a.)
- Webhook-Throughput — separater Test, dedupliziert auf `provider_ref` UNIQUE
