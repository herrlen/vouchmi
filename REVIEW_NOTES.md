# App Store Review Notes — Vouchmi 1.0.0 (Build 8)

> Copy the section below into App Store Connect → "App Review Information" → "Notes". Replace the `<<…>>` placeholders before submitting.

---

## Notes for the App Reviewer

Hi reviewer, thanks for taking the time to look at Vouchmi.

**What is Vouchmi?**
Vouchmi is a German-language community-commerce platform where consumers ("Users"), creators ("Influencers") and brands share product recommendations, follow each other and exchange messages inside topical communities. The app does not run its own shop — every shared link points to an external retailer. There are three roles selectable on sign-up: User (free), Influencer (€0.99/month subscription) and Brand (€1.99/month subscription).

**Demo account (no phone-verification required):**
- E-mail: `<<reviewer@vouchmi.com>>`
- Password: `<<DEMO_PASSWORD>>`
- Username: `<<reviewer>>`

This account already has the Influencer subscription enabled in our test environment, so no real purchase is needed to evaluate gated screens. If you want to evaluate the IAP purchase flow itself, please use a sandbox tester account on the registration screens (see below).

---

## Testing the In-App Purchases

Both subscriptions are auto-renewing, monthly:
- `com.vouchmi.app.influencer.monthly` — €0.99/month
- `com.vouchmi.app.brand.monthly` — €1.99/month

To reach the purchase flow:

1. Launch the app and tap **"Registrieren"** on the welcome screen.
2. On the role selector, choose either **"Als Influencer starten"** (€0.99) or **"Als Marke starten"** (€1.99).
3. Fill in e-mail, username, password, accept the terms, tap **"Weiter"**.
4. The next screen shows the price and the StoreKit purchase sheet appears on **"Als Influencer starten — 0,99 EUR/Monat"** / **"Als Brand starten — 1,99 EUR/Monat"**.
5. After successful sandbox purchase, the receipt is validated by our backend (`POST /api/v1/iap/validate`) and the role is granted.

A **Restore Purchases** button is available on:
- the Influencer registration screen (bottom)
- the Brand registration screen (bottom)
- **Einstellungen → Abo** (settings → subscription)

---

## Critical user flows you may want to test

| Flow | Path |
| --- | --- |
| Sign-in | Welcome → "Anmelden" — works with e-mail OR username |
| Forgot password | Welcome → "Passwort vergessen?" — link sent via e-mail |
| Account deletion (App Review Guideline 5.1.1(v)) | Einstellungen → "Account löschen" → confirm dialog |
| Browse public profile | Open `https://app.vouchmi.com/@<<reviewer>>` in mobile Safari → opens in app via Universal Link |
| Join a community | Discover → tap a community card → "Beitreten" |
| Create a recommendation | "+" tab → paste any product link → publish |
| Purchase Restore | Einstellungen → Abo → "Käufe wiederherstellen" |

---

## Permissions used

| Permission | Where in the app | Reason |
| --- | --- | --- |
| Camera (`NSCameraUsageDescription`) | Profile picture, community cover, photo posts | User taps "Camera" on the image picker |
| Photo Library (`NSPhotoLibraryUsageDescription`) | Profile picture, community cover, posts | User taps "Library" on the image picker |
| Contacts (`NSContactsUsageDescription`) | "Find Friends" feature | Optional — user explicitly taps "Kontakte abgleichen". Phone numbers are hashed before transmission. |
| Push Notifications | Direct Messages, mentions, follows | Standard APNs registration; user can opt out in iOS Settings |

The app does **not** request Microphone, Face ID, Location or Tracking permissions.

---

## Network domains the app contacts

- `api.vouchmi.com` — our Laravel backend (auth, content, IAP validation)
- `app.vouchmi.com` — web portal (used only via Universal Links from outside the app)
- Apple StoreKit / App Store Server API — IAP receipt verification (server-side)

ATS (App Transport Security) is fully enabled with no `NSAllowsArbitraryLoads`. All traffic is HTTPS.

---

## Privacy & legal

- Privacy Policy: https://vouchmi.com/datenschutz
- Terms of Service: https://vouchmi.com/agb
- Imprint: https://vouchmi.com/impressum
- Account deletion is available **inside the app** (Einstellungen → Account löschen) and described on the privacy page.

The privacy manifest (`PrivacyInfo.xcprivacy`) declares all data types we collect (e-mail, name, phone, user-ID, device-ID, content, interaction, purchase history, crash + performance data) and their purposes. We do not track users and do not share data with third-party advertising networks.

---

## Special features in this build

- **Live Activities** (`NSSupportsLiveActivities = true`) — currently scaffolded but not yet activated by user-facing UI; placeholder for upcoming "active drop" indicator.
- **Share Extension** — lets the user share a product URL from Safari/other apps directly into Vouchmi as a draft post.
- **App Group** `group.com.vouchmi.app` — shared between the main app and the share extension.

---

## Contact

If anything is unclear or you can't reach a screen, please email **support@vouchmi.com** — Len Messerschmidt (founder, technical contact) responds within 24h.

Vielen Dank fürs Reviewen / Thank you for the review!
