<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Wichtige Änderung: Vouchmi wechselt zu Credits</title>
</head>
<body style="margin:0;padding:0;background:#1A1D2E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#E8EAED;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1A1D2E;padding:32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#242838;border-radius:16px;overflow:hidden;">
                    <tr>
                        <td style="padding:32px 32px 24px 32px;text-align:center;">
                            <div style="color:#F59E0B;font-size:30px;font-weight:900;letter-spacing:-1px;">Vouchmi</div>
                            <div style="color:#94A3B8;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-top:4px;">Wichtige Mitteilung</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 32px 8px 32px;">
                            <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0 0 12px;">Vouchmi wechselt zu Credits — und dein Abo läuft aus.</h1>
                            <p style="color:#C5C7CC;font-size:15px;line-height:1.6;margin:0 0 18px;">
                                Hallo {{ $displayName }},<br><br>
                                ab dem <strong>{{ $sunsetDate }}</strong> stellt Vouchmi auf ein neues Modell um:
                                statt monatlicher Abos zahlst du nur, wenn du Reichweite brauchst.
                                Wir lösen dein {{ $planLabel }}-Abo zum genannten Datum auf — du musst nichts tun.
                            </p>
                            <div style="background:#1F2235;border-radius:12px;padding:18px;margin:0 0 20px;">
                                <div style="color:#94A3B8;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;">Was du bekommst</div>
                                <div style="color:#F59E0B;font-size:32px;font-weight:800;line-height:1;">{{ number_format($credits, 0, ',', '.') }} Credits</div>
                                <div style="color:#94A3B8;font-size:12px;margin-top:8px;">
                                    Pro-rata für die Restlaufzeit deines Abos plus {{ $bonusPercent }} % Goodwill-Bonus.
                                    Die Credits sind 3 Jahre gültig.
                                </div>
                            </div>
                            <p style="color:#C5C7CC;font-size:14px;line-height:1.6;margin:0 0 12px;">
                                <strong>Was du mit Credits machen kannst:</strong> Empfehlungen bewerben („Boost"),
                                um für eine begrenzte Zeit mehr Reichweite zu erzeugen. Tarife ab 50 Credits.
                            </p>
                            @if ($paymentProvider === 'apple_iap')
                            <p style="color:#FBBF24;font-size:13px;line-height:1.6;margin:18px 0 0;background:rgba(245,158,11,0.08);border-radius:10px;padding:14px 16px;">
                                <strong>Wichtig (iOS-Nutzer):</strong> Dein Abo läuft über Apple. Apple verlängert
                                es automatisch, solange du nicht selbst die Verlängerung deaktivierst. Bitte öffne
                                deine iPhone-Einstellungen → Apple-ID → Abonnements und deaktiviere Vouchmi-Abo.
                                Deine Credits bekommst du unabhängig davon gutgeschrieben.
                            </p>
                            @endif
                            <p style="color:#94A3B8;font-size:12px;line-height:1.6;margin:24px 0 0;">
                                Fragen? Antworte einfach auf diese E-Mail.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:24px 32px 32px 32px;text-align:center;border-top:1px solid #2A2D40;">
                            <div style="color:#5A6178;font-size:11px;">© {{ date('Y') }} Vouchmi · <a href="https://vouchmi.com/agb.html" style="color:#94A3B8;">AGB</a> · <a href="https://vouchmi.com/datenschutz.html" style="color:#94A3B8;">Datenschutz</a></div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
