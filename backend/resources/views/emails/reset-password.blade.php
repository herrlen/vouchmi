<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Passwort zurücksetzen</title>
</head>
<body style="margin:0;padding:0;background:#1A1D2E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#E8EAED;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1A1D2E;padding:32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#242838;border-radius:16px;overflow:hidden;">
                    <tr>
                        <td style="padding:32px 32px 24px 32px;text-align:center;">
                            <div style="color:#25D366;font-size:30px;font-weight:900;letter-spacing:-1px;">Vouchmi</div>
                            <div style="color:#8A8E99;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-top:4px;">Community Commerce</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 32px 8px 32px;">
                            <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0 0 12px;">Passwort zurücksetzen</h1>
                            <p style="color:#C5C7CC;font-size:15px;line-height:1.6;margin:0 0 18px;">
                                Hallo {{ $displayName }},<br><br>
                                du hast angefordert, dein Vouchmi-Passwort zurückzusetzen. Tippe auf den Button, um ein neues Passwort zu vergeben.
                            </p>
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding:20px 0;">
                                        <a href="{{ $resetUrl }}" style="background:#25D366;color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:700;font-size:15px;display:inline-block;">
                                            Passwort zurücksetzen
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="color:#8A8E99;font-size:13px;line-height:1.6;margin:4px 0 14px;">
                                Der Link ist <strong style="color:#C5C7CC;">60 Minuten</strong> gültig.<br>
                                Falls der Button nicht funktioniert, öffne diese URL in deiner App:
                            </p>
                            <p style="color:#8A8E99;font-size:12px;line-height:1.5;word-break:break-all;background:#1A1D2E;padding:12px;border-radius:8px;margin:0 0 22px;">
                                {{ $resetUrl }}
                            </p>
                            <p style="color:#8A8E99;font-size:12px;line-height:1.6;margin:0;border-top:1px solid #2F3447;padding-top:18px;">
                                Du hast diesen Link nicht angefordert? Dann ignoriere diese E-Mail einfach — dein Passwort bleibt unverändert.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:22px 32px;background:#1A1D2E;text-align:center;">
                            <div style="color:#5A5E6B;font-size:11px;line-height:1.6;">
                                Len Messerschmidt e.K. · Norderreihe 21 · 22767 Hamburg<br>
                                kontakt@vouchmi.com
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
