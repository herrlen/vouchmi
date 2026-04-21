# Changelog

## [Unreleased]

### Removed
- Story feature (ephemeral posts) — entfernt am 2026-04-21.
  Kein Use-Case, UI-Konflikt mit Core-Flow, produzierte Fehler beim Posten.
  Migration: `2026_04_21_000001_drop_stories_table.php` droppt die `stories`-Tabelle.
  Auf Staging + Production ausführen: `php artisan migrate --force`
