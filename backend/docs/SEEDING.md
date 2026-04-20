# Vouchmi Seed-Daten

## Befehle

```bash
# Nur seeden (bestehende Seed-Daten werden vorher gelöscht)
php artisan vouchmi:seed

# Kompletter Reset: alle Tabellen neu + seeden
php artisan vouchmi:seed --fresh
```

## Demo-Accounts

| Rolle | E-Mail | Passwort |
|---|---|---|
| User | review@vouchmi.com | VouchmiReview2026! |
| Influencer | influencer-demo@vouchmi.com | VouchmiReview2026! |
| Brand | brand-demo@vouchmi.com | VouchmiReview2026! |

Diese Accounts sind für Entwicklung und App Store Review gedacht.

## Was wird geseedet?

- 15 User (3 Demo + 12 Fake)
- 8 Communities mit Memberships
- ~200 Posts mit Produkt-Links (Fixture-Daten, kein Netzwerk nötig)
- ~600 Likes, ~200 Kommentare, 30 Bookmarks für Demo-User
- Follow-Beziehungen
- 3 Brand Drops (2 aktiv, 1 beendet)
- 1 Brand-Profil mit aktivem PayPal-Abo

## Idempotenz

Der Seeder ist idempotent: alle Records mit `is_seed = true` werden am Start gelöscht, dann neu erstellt. Mehrfaches Ausführen ist sicher.

## WARNUNG

Der Guard in `VouchmiSeedCommand` verhindert die Ausführung gegen Production-Datenbanken (`APP_ENV=production`). Die Passwörter sind öffentlich — die Demo-Accounts existieren nur in Dev/Staging.
