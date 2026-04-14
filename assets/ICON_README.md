# App Icon & Splash Screen

## Benötigte Dateien

1. `icon.png` — 1024x1024 px, PNG, kein Transparenz (Apple verlangt das)
2. `adaptive-icon.png` — 1024x1024 px, PNG (Android Adaptive Icon, Vordergrund)
3. `splash-icon.png` — 200x200 px, PNG (wird auf dem Splash-Screen zentriert)

## Design-Vorgaben

- Hintergrund: #111B21 (Vouchmi Dark)
- Akzentfarbe: #25D366 (Vouchmi Grün)
- Logo: Stilisiertes "T" oder Kompass-Symbol in Grün auf dunklem Hintergrund
- Keine Transparenz beim iOS-Icon (Apple Requirement)
- Abgerundete Ecken NICHT im Icon — iOS rundet automatisch

## Schnell-Lösung

Nutze einen kostenlosen Icon-Generator:
- https://icon.kitchen — Material Design Icons, eigene Farben
- https://www.canva.com — Eigenes Design, Export als 1024x1024 PNG

Lege die Dateien hier im `assets/`-Ordner ab, dann greift die app.config.ts automatisch.
