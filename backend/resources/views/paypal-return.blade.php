<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $state === 'success' ? 'Abo aktiviert' : 'Abo abgebrochen' }} — Vouchmi</title>
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0; padding: 24px;
            background: #1A1D2E;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #E8EAED;
            min-height: 100vh;
            display: flex; align-items: center; justify-content: center;
        }
        .card {
            width: 100%; max-width: 440px;
            background: #242838;
            border-radius: 16px;
            padding: 32px;
            text-align: center;
        }
        .logo { color: #25D366; font-size: 30px; font-weight: 900; letter-spacing: -1px; }
        .tagline { color: #8A8E99; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; margin-bottom: 28px; }
        .icon { font-size: 48px; margin-bottom: 16px; line-height: 1; }
        h1 { color: #fff; font-size: 22px; font-weight: 700; margin: 0 0 12px; }
        p { color: #C5C7CC; font-size: 15px; line-height: 1.6; margin: 0 0 18px; }
        .btn {
            display: inline-block;
            background: #25D366; color: #fff;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 12px;
            font-weight: 700; font-size: 15px;
            margin: 8px 0;
        }
        .btn.neutral { background: transparent; border: 1px solid #2F3447; color: #C5C7CC; }
        .hint { color: #8A8E99; font-size: 13px; margin-top: 16px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="logo">Vouchmi</div>
        <div class="tagline">Community Commerce</div>

        @if ($state === 'success')
            <div class="icon">✅</div>
            <h1>{{ $role === 'brand' ? 'Brand-Abo aktiviert' : 'Influencer-Abo aktiviert' }}</h1>
            <p>
                Danke! Die Zahlung ist abgeschlossen und dein Abo wird gerade aktiviert.
                Tippe auf den Button, um zu Vouchmi zurückzukehren — dort siehst du deinen neuen Status.
            </p>
        @else
            <div class="icon">⏸</div>
            <h1>Abo nicht abgeschlossen</h1>
            <p>
                Du hast den Bezahlvorgang abgebrochen. Du kannst ihn jederzeit erneut in der App starten.
            </p>
        @endif

        @php($deepLink = 'vouchmi://' . $role . '-return' . ($state === 'cancel' ? '?cancel=1' : ''))
        <a class="btn" href="{{ $deepLink }}">In Vouchmi-App öffnen</a>

        <p class="hint">
            Du kannst dieses Fenster schließen und zu deiner Vouchmi-App zurückwechseln.
        </p>
    </div>

    <script>
        // Nach kurzer Verzögerung die App per Deep-Link öffnen (funktioniert auf iOS/Android,
        // wird auf Desktop ignoriert, dort reicht der manuelle Button).
        setTimeout(function () {
            window.location.href = "{{ $deepLink }}";
        }, 500);
    </script>
</body>
</html>
