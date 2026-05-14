// k6 Load Test — Credits & Boost System
//
// Run:
//   k6 run --env API=https://staging-api.vouchmi.com --env TOKEN=<sanctum-token> loadtest/credits.js
//
// What this exercises:
//   1. Wallet reads (cheap, baseline)
//   2. Boost-Sheet open (GET /v1/wallet + /v1/wallet/packages parallel)
//   3. Promoted-Feed reads (boost-heavy query)
//
// What this DOES NOT exercise (and why):
//   - Real PayPal/Apple topups — they need provider sandboxes, not load.
//   - DB locking under concurrent topups — already covered by PHPUnit tests
//     (WalletServiceTest) that simulate concurrency via Mockery + transactions.
//
// Expected behaviour at the configured load (50 VUs over 2 min):
//   - p95 < 400ms for all reads
//   - error rate < 1%
//   - no 5xx
//
// Tweak VUs/duration via env vars: STAGES=spike, STAGES=soak.

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate } from "k6/metrics";

const API = __ENV.API || "https://staging-api.vouchmi.com";
const TOKEN = __ENV.TOKEN;
const STAGES = __ENV.STAGES || "smoke";

const errors = new Rate("errors");

const STAGE_PROFILES = {
  smoke: [
    { duration: "30s", target: 5 },
    { duration: "30s", target: 5 },
  ],
  ramp: [
    { duration: "1m", target: 50 },
    { duration: "2m", target: 50 },
    { duration: "30s", target: 0 },
  ],
  spike: [
    { duration: "10s", target: 100 },
    { duration: "30s", target: 100 },
    { duration: "10s", target: 0 },
  ],
  soak: [
    { duration: "5m", target: 30 },
    { duration: "30m", target: 30 },
    { duration: "30s", target: 0 },
  ],
};

export const options = {
  stages: STAGE_PROFILES[STAGES] || STAGE_PROFILES.smoke,
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<400"],
    errors: ["rate<0.01"],
  },
};

function authHeaders() {
  if (!TOKEN) throw new Error("Set TOKEN env var to a valid Sanctum token");
  return {
    Authorization: `Bearer ${TOKEN}`,
    Accept: "application/json",
  };
}

export default function () {
  group("wallet read", () => {
    const r = http.get(`${API}/api/v1/wallet`, { headers: authHeaders() });
    const ok = check(r, {
      "wallet 200": (resp) => resp.status === 200,
      "has balance": (resp) => "balance_credits" in resp.json("wallet"),
    });
    errors.add(!ok);
  });

  group("packages read", () => {
    const r = http.get(`${API}/api/v1/wallet/packages`);
    const ok = check(r, {
      "packages 200": (resp) => resp.status === 200,
      "has packages array": (resp) => Array.isArray(resp.json("packages")),
    });
    errors.add(!ok);
  });

  group("promoted feed", () => {
    const r = http.get(`${API}/api/v1/feed/promoted`, { headers: authHeaders() });
    const ok = check(r, {
      "promoted 200": (resp) => resp.status === 200,
      "posts is array": (resp) => Array.isArray(resp.json("posts")),
    });
    errors.add(!ok);
  });

  group("discover boosted", () => {
    const r = http.get(`${API}/api/v1/discover/boosted`, { headers: authHeaders() });
    const ok = check(r, {
      "discover 200": (resp) => resp.status === 200,
    });
    errors.add(!ok);
  });

  sleep(1);
}
