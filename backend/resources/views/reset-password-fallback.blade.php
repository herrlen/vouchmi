<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Passwort zurücksetzen — Vouchmi</title>
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0; padding: 0;
            background: #1A1D2E;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #E8EAED;
            min-height: 100vh;
            display: flex; align-items: center; justify-content: center;
            padding: 24px;
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
        .btn-secondary {
            background: transparent;
            color: #8A8E99;
            border: 1px solid #2F3447;
        }
        .error { color: #F472B6; font-size: 14px; }
        .hint { color: #8A8E99; font-size: 13px; margin-top: 16px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="logo">Vouchmi</div>
        <div class="tagline">Community Commerce</div>

        @if (empty($token) || empty($email))
            <h1>Ungültiger Link</h1>
            <p class="error">Dieser Link ist nicht vollständig. Bitte fordere einen neuen Reset-Link in der App an.</p>
        @else
            <h1>Passwort zurücksetzen</h1>
            <p>Tippe auf den Button, um den Reset in der Vouchmi-App abzuschließen.</p>

            <a id="open-app" class="btn" href="vouchmi://reset-password?token={{ urlencode($token) }}&email={{ urlencode($email) }}">
                In Vouchmi-App öffnen
            </a>

            <p class="hint">
                Du hast die App noch nicht installiert? Lade Vouchmi im App Store und öffne diesen Link dann erneut.
            </p>
        @endif
    </div>

    @if (!empty($token) && !empty($email))
    <script>
        // Versucht sofort, die App per Custom Scheme zu öffnen — falls der Universal
        // Link nicht gegriffen hat (Gmail/Desktop-Browser etc.).
        (function () {
            var deepLink = 'vouchmi://reset-password?token={{ urlencode($token) }}&email={{ urlencode($email) }}';
            setTimeout(function () { window.location.href = deepLink; }, 300);
        })();
    </script>
    @endif
</body>
</html>
