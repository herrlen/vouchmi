<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Deine Credits sind gutgeschrieben</title>
</head>
<body style="margin:0;padding:0;background:#1A1D2E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#E8EAED;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1A1D2E;padding:32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#242838;border-radius:16px;overflow:hidden;">
                    <tr>
                        <td style="padding:32px 32px 24px 32px;text-align:center;">
                            <div style="color:#F59E0B;font-size:30px;font-weight:900;letter-spacing:-1px;">Vouchmi</div>
                            <div style="color:#94A3B8;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-top:4px;">Credits aktiviert</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 32px 8px 32px;">
                            <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0 0 12px;">{{ number_format($credits, 0, ',', '.') }} Credits warten auf dich.</h1>
                            <p style="color:#C5C7CC;font-size:15px;line-height:1.6;margin:0 0 18px;">
                                Hallo {{ $displayName }},<br><br>
                                wie angekündigt haben wir dein {{ $planLabel }}-Abo aufgelöst und dir
                                <strong>{{ number_format($credits, 0, ',', '.') }} Credits</strong> auf dein Vouchmi-Konto
                                gutgeschrieben. Du kannst sie ab sofort nutzen, um deine Empfehlungen zu bewerben.
                            </p>

                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding:8px 0 20px;">
                                        <a href="{{ $walletUrl }}" style="background:#F59E0B;color:#1A1D2E;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:700;font-size:15px;display:inline-block;">
                                            Zum Wallet
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <div style="background:#1F2235;border-radius:12px;padding:16px 18px;margin:0 0 20px;">
                                <div style="color:#fff;font-size:13px;font-weight:600;margin-bottom:8px;">So funktioniert ein Boost</div>
                                <ul style="color:#C5C7CC;font-size:13px;line-height:1.7;margin:0;padding-left:18px;">
                                    <li>Drei-Punkte-Menü auf deiner Empfehlung öffnen</li>
                                    <li>„Empfehlung bewerben" → Tarif wählen (50 / 150 / 400 / 1.000 Credits)</li>
                                    <li>Reichweite × 2 bis × 8 für die gewählte Laufzeit</li>
                                </ul>
                            </div>

                            <p style="color:#94A3B8;font-size:12px;line-height:1.6;margin:24px 0 0;">
                                Credits sind 3 Jahre gültig. Geboostete Posts werden mit „Beworben" gekennzeichnet (DSA).
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
