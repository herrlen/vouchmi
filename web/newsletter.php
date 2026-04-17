<?php
/**
 * Vouchmi — Newsletter Handler
 *
 * Workflow:
 * 1. User trägt E-Mail ins Formular ein
 * 2. Dieses Skript empfängt die E-Mail, erzeugt einen Bestätigungs-Token
 * 3. User bekommt Mail mit Bestätigungs-Link
 * 4. Bei Klick auf Link wird die E-Mail als "bestätigt" markiert
 * 5. Erst dann ist sie rechtswirksam im Verteiler (DSGVO Double-Opt-In!)
 *
 * Speicherung:
 * - /newsletter_data/pending.csv  -> unbestätigte Anmeldungen
 * - /newsletter_data/confirmed.csv -> bestätigte Abonnenten
 *
 * Wichtig: Dieses Skript ist ein MINIMAL-Setup. Für Produktion empfohlen:
 * - Umstieg auf Mailchimp, Brevo (Sendinblue), CleverReach oder Rapidmail
 * - Diese Dienste haben Double-Opt-In, Templates, Bounce-Handling & DSGVO-AVV fix und fertig
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

// ========== KONFIGURATION ==========
$CONFIG = [
    'from_email'      => 'newsletter@vouchmi.com',
    'from_name'       => 'Vouchmi Newsletter',
    'admin_email'     => 'hello@vouchmi.com',     // Info an Admin bei neuer Anmeldung (optional)
    'data_dir'        => __DIR__ . '/newsletter_data',
    'confirm_url'     => 'https://vouchmi.com/newsletter.php', // mit ?action=confirm&token=...
    'rate_limit_max'  => 3,                       // max. 3 Anmeldungen pro IP pro Stunde
];

// ========== HELPER ==========
function respond(bool $ok, ?string $error = null, array $extra = []): void {
    echo json_encode(['ok' => $ok] + ($error ? ['error' => $error] : []) + $extra);
    exit;
}

function valid_email(string $e): bool {
    return (bool) filter_var($e, FILTER_VALIDATE_EMAIL);
}

function ensure_dir(string $dir): void {
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
}

// ========== ROUTING ==========
ensure_dir($CONFIG['data_dir']);
$action = $_GET['action'] ?? ($_SERVER['REQUEST_METHOD'] === 'POST' ? 'signup' : 'status');

// ========================================================
// 1) CONFIRM — User klickt auf Bestätigungs-Link in Mail
// ========================================================
if ($action === 'confirm') {
    $token = trim($_GET['token'] ?? '');
    if (!$token || !preg_match('/^[a-f0-9]{64}$/', $token)) {
        http_response_code(400);
        echo 'Ungültiger Bestätigungs-Link.';
        exit;
    }

    $pending_file = $CONFIG['data_dir'] . '/pending.csv';
    $confirmed_file = $CONFIG['data_dir'] . '/confirmed.csv';

    if (!file_exists($pending_file)) {
        echo 'Kein offener Bestätigungs-Request gefunden.';
        exit;
    }

    $lines = file($pending_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $remaining = [];
    $found_email = null;

    foreach ($lines as $line) {
        $parts = str_getcsv($line);
        if (count($parts) < 3) { $remaining[] = $line; continue; }
        [$email, $stored_token, $timestamp] = $parts;
        if (hash_equals($stored_token, $token)) {
            $found_email = $email;
            // Nicht in remaining aufnehmen -> aus pending entfernen
        } else {
            $remaining[] = $line;
        }
    }

    if (!$found_email) {
        http_response_code(404);
        echo 'Bestätigungs-Link ungültig oder bereits verwendet.';
        exit;
    }

    // Als bestätigt speichern
    $confirmed_entry = implode(',', [
        $found_email,
        date('c'),
        $_SERVER['REMOTE_ADDR'] ?? 'unknown'
    ]);
    @file_put_contents($confirmed_file, $confirmed_entry . "\n", FILE_APPEND | LOCK_EX);
    @file_put_contents($pending_file, implode("\n", $remaining) . "\n", LOCK_EX);

    // Hübsche Bestätigungs-Seite ausgeben
    echo '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">';
    echo '<title>Anmeldung bestätigt — Vouchmi</title>';
    echo '<meta name="viewport" content="width=device-width, initial-scale=1">';
    echo '<style>body{font-family:system-ui,sans-serif;background:#1A1D2E;color:white;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:20px;text-align:center}';
    echo '.card{background:rgba(255,255,255,0.05);border-radius:20px;padding:48px;max-width:480px;border:1px solid rgba(255,255,255,0.1)}';
    echo '.check{width:64px;height:64px;border-radius:50%;background:#10B981;color:white;font-size:32px;display:flex;align-items:center;justify-content:center;margin:0 auto 24px}';
    echo 'h1{font-size:28px;margin-bottom:12px}p{color:rgba(255,255,255,0.7);line-height:1.6;margin-bottom:24px}';
    echo 'a{display:inline-block;background:#F59E0B;color:#1A1D2E;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600}</style>';
    echo '</head><body><div class="card">';
    echo '<div class="check">✓</div>';
    echo '<h1>Anmeldung bestätigt!</h1>';
    echo '<p>Super, ' . htmlspecialchars($found_email, ENT_QUOTES) . ' ist jetzt im Verteiler. Du bekommst einmal im Monat die Vouchmi-Highlights in dein Postfach.</p>';
    echo '<a href="index.html">Zurück zur Startseite</a>';
    echo '</div></body></html>';
    exit;
}

// ========================================================
// 2) SIGNUP — User trägt E-Mail ein (POST)
// ========================================================
if ($action !== 'signup') {
    respond(false, 'unknown_action');
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    respond(false, 'method_not_allowed');
}

// Rate Limiting (einfach, nach IP)
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rate_file = $CONFIG['data_dir'] . '/rate_' . md5($ip) . '.txt';
$now = time();
$hour_ago = $now - 3600;

$requests = [];
if (file_exists($rate_file)) {
    $requests = array_filter(
        array_map('intval', file($rate_file, FILE_IGNORE_NEW_LINES)),
        fn($t) => $t >= $hour_ago
    );
}
if (count($requests) >= $CONFIG['rate_limit_max']) {
    http_response_code(429);
    respond(false, 'rate_limit');
}

// E-Mail validieren
$email = trim(strtolower($_POST['email'] ?? ''));
if (!valid_email($email)) {
    http_response_code(422);
    respond(false, 'invalid_email');
}

// Prüfen, ob bereits bestätigt
$confirmed_file = $CONFIG['data_dir'] . '/confirmed.csv';
if (file_exists($confirmed_file)) {
    $confirmed = file($confirmed_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($confirmed as $line) {
        $parts = str_getcsv($line);
        if (isset($parts[0]) && strcasecmp($parts[0], $email) === 0) {
            // Schon angemeldet -> still success zurückgeben (Info-Leak vermeiden)
            respond(true);
        }
    }
}

// Token erzeugen
$token = bin2hex(random_bytes(32));

// In pending.csv schreiben
$pending_entry = implode(',', [$email, $token, date('c')]);
$pending_file = $CONFIG['data_dir'] . '/pending.csv';
@file_put_contents($pending_file, $pending_entry . "\n", FILE_APPEND | LOCK_EX);

// Bestätigungs-Mail bauen
$confirm_link = $CONFIG['confirm_url'] . '?action=confirm&token=' . $token;

$subject = 'Bitte bestätige deine Anmeldung zum Vouchmi Newsletter';

$body = "Hallo,\n\n";
$body .= "danke für dein Interesse am Vouchmi Newsletter!\n\n";
$body .= "Um deine Anmeldung zu bestätigen, klicke bitte auf diesen Link:\n\n";
$body .= $confirm_link . "\n\n";
$body .= "Wenn du dich nicht angemeldet hast, ignoriere diese Mail einfach — ohne Klick passiert nichts.\n\n";
$body .= "Viele Grüße\nDein Vouchmi-Team\n\n";
$body .= "— — — — — — — — — — — — — — — —\n";
$body .= "Vouchmi · Community Recommendation Marketing\n";
$body .= "https://vouchmi.com\n\n";
$body .= "Diese Mail wurde an " . $email . " gesendet, weil diese Adresse auf vouchmi.com im Newsletter-Formular eingetragen wurde.\n";

$headers = [
    'From: ' . $CONFIG['from_name'] . ' <' . $CONFIG['from_email'] . '>',
    'Reply-To: ' . $CONFIG['admin_email'],
    'X-Mailer: PHP/' . phpversion(),
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
];

$sent = @mail(
    $email,
    '=?UTF-8?B?' . base64_encode($subject) . '?=',
    $body,
    implode("\r\n", $headers),
    '-f' . $CONFIG['from_email']
);

if (!$sent) {
    error_log('[Vouchmi Newsletter] mail() failed for ' . $email);
    http_response_code(500);
    respond(false, 'send_failed');
}

// Rate-Limit Update
$requests[] = $now;
@file_put_contents($rate_file, implode("\n", $requests));

// Erfolg (auch ohne Bestätigung — User sieht jetzt "Bitte Mail bestätigen")
respond(true);
