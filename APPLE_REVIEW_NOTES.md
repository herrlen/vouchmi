# Apple App Store Review Notes — Vouchmi Credits

> Diese Notizen sind für das **App Review Information**-Feld in App Store Connect
> gedacht. Apple-Reviewer haben in der Vergangenheit bei "Boost"- oder
> "Sponsored content"-Mechaniken nachgefragt — gute Notes verhindern einen
> 24–48h-Reject-Cycle.

---

## Test Account

```
E-Mail:   review@vouchmi.com
Passwort: <hier-im-App-Store-Connect-eintragen>
```

Account ist mit folgenden Eigenschaften vorbereitet:
- Rolle: Influencer
- 2 eigene Empfehlungen (Posts) im Feed
- 0 Credits zum Start
- Sandbox-IAP funktioniert mit `apple_sandbox@vouchmi.com` Tester

---

## What's New in This Version

Vouchmi stellt von monatlichen Abos auf ein **Credits-Modell** um:

- Statt 0,99 €/Monat Influencer-Abo oder 1,99 €/Monat Brand-Abo bieten wir jetzt
  vier Consumable-Credit-Pakete (500 / 1.500 / 5.000 / 15.000 Credits) zu Preisen
  zwischen 4,99 € und 99,99 €.
- Mit Credits kann der Nutzer einzelne eigene Empfehlungen für eine begrenzte Zeit
  bewerben („Boost"). Boosts erhöhen die Reichweite im App-internen Feed,
  vergleichbar mit Instagram's „Promote Post".
- Alle Features, die früher das Abo erforderten, sind jetzt **kostenlos**:
  Direktnachrichten an Brands/Influencer, Analytics, Creator-Badge.

---

## In-App Purchase Products

Alle vier Produkte sind **Consumable** (Type: Consumable).

| Product ID | Display Name | Description | Price Tier |
|---|---|---|---|
| `com.vouchmi.credits.500`   | 500 Vouchmi Credits   | Reichweite für ca. 10 Mini-Boosts | Tier 5 (4,99 €) |
| `com.vouchmi.credits.1500.v2` | 1.500 Vouchmi Credits | Reichweite für ca. 10 Standard-Boosts | 12,99 € |
| `com.vouchmi.credits.5000`  | 5.000 Vouchmi Credits | Reichweite für mehrere Pro-Boosts | Tier 39 (39,99 €) |
| `com.vouchmi.credits.15000` | 15.000 Vouchmi Credits| Reichweite für Power-Creator | Tier 99 (99,99 €) |

**Validierung serverseitig:** Jede Transaktion wird über die App Store Server API
gegen-verifiziert (JWS-Signatur, originalTransactionId, environment). Erst nach
erfolgreicher Validierung werden die Credits gutgeschrieben.

**Refunds:** Apple-Refunds (`REFUND`-Notification) lösen automatisch eine
Rückbuchung der Credits aus.

---

## How a Boost Works (Review-Path)

1. Reviewer öffnet die App, geht zu **Profil → Wallet**.
2. Wallet zeigt 0 Credits + vier Topup-Pakete. Reviewer wählt das günstigste
   (500 Credits / 4,99 €).
3. StoreKit-Sheet → Sandbox-Tester-Login → Apple bestätigt den Kauf.
4. Backend validiert, Wallet zeigt 500 Credits.
5. Reviewer geht zu **Feed → eigene Empfehlung → Drei-Punkte-Menü → „Empfehlung bewerben"**.
6. Boost-Sheet zeigt vier Tarife. Reviewer wählt „Mini-Boost" (50 Credits, ×2 Reichweite, 6 Std.).
7. Bestätigung → Post bekommt „Beworben"-Badge, läuft 6 Stunden.

---

## Where Credits Are Consumed

**Ausschließlich in der App.** Credits können nicht ausgezahlt, übertragen oder
außerhalb der App genutzt werden. Es gibt keine Goods-and-Services-outside-the-App
(Guideline 3.1.5(a)) Konstellation.

---

## "Beworben"-Kennzeichnung (DSA-Compliance)

Geboostete Empfehlungen werden im Feed mit einem klar sichtbaren
**„Beworben"-Badge** gekennzeichnet — entsprechend EU Digital Services Act
(Art. 26) und §6 deutsches Telemediengesetz. Dies ist nicht versteckte oder
manipulierte Werbung; Nutzer:innen erkennen sofort, dass ein Post bezahlt
beworben ist.

---

## Restore Purchases

Credit-Käufe sind **Consumables** und müssen laut Apple-Richtlinien nicht
restored werden (Guideline 3.1.1). Wir bieten dennoch eine Restore-Funktion für
das bestehende (auslaufende) Abo-Modell auf dem Subscription-Screen.

Falls ein Nutzer auf einem neuen Gerät einsteigt, sind die Credits über das
serverseitige Wallet bereits dort verfügbar (an User-Account gebunden, nicht
an Gerät).

---

## Other Payment Methods

Auf iOS gibt es **ausschließlich Apple IAP** für Credit-Käufe. PayPal-Topups
funktionieren nur im Web-Browser (vouchmi.com) bzw. auf Android, **nicht in der
iOS-App**. Die App linkt nicht auf externe Zahlungsseiten und kommuniziert
keine alternativen Zahlungsmethoden gegenüber iOS-Nutzern.

---

## Existing Subscribers (Migration)

Nutzer mit aktivem Apple-IAP-Abo behalten ihr Abo zunächst. Wir kommunizieren
zwei Wochen vorher per E-Mail, dass das Abo zu einem festen Datum endet — ihre
Restlaufzeit wird in Credits umgewandelt + 20 % Goodwill-Bonus gutgeschrieben.
Da nur der Nutzer selbst Auto-Renew in iOS-Settings deaktivieren kann, zeigt
unsere App einen klaren Banner mit Deep-Link `itms-apps://apps.apple.com/account/subscriptions`.

---

## Demo Video / Screenshots

(Falls Apple Demo-Video anfordert: kurzes 60s-Screen-Recording vorbereiten, das
einen kompletten Topup → Boost → Beworben-Badge-Zyklus zeigt.)

---

## Contact for Review Questions

E-Mail: support@vouchmi.com
Antwortzeit: < 24h
