<?php
/**
 * Vouchmi — Kontaktformular Handler
 *
 * Nutzung:
 * - POST-Request von kontakt.html
 * - Erwartete Felder: name, email, subject, message, consent, website (honeypot)
 * - Antwort: JSON { ok: true/false, error?: string }
 *
 * Sicherheitsfeatures:
 * - Honeypot gegen Bots
 * - Rate Limiting (max. 5 Requests pro IP pro Stunde)
 * - Eingabe-Validierung & Sanitizing
 * - Header-Injection-Schutz
 *
 * Produktiv-Empfehlung:
 * - PHPMailer mit SMTP (statt mail()) nutzen für bessere Zustellbarkeit
 * - In Linevast cPanel: SPF + DKIM Record für vouchmi.com einrichten
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

// ========== KONFIGURATION ==========
$CONFIG = [
    'recipient_email' => 'hello@vouchmi.com',   // Empfänger-Adresse
    'from_email'      => 'kontakt@vouchmi.com', // Absender (muss zur Domain gehören!)
    'from_name'       => 'Vouchmi Kontaktformular',
    'rate_limit_max'  => 5,                     // max. Anfragen pro Stunde / IP
    'rate_limit_dir'  => __DIR__ . '/rate_limits', // Ordner für Rate-Limit-Tracking
];

// ========== HELPER ==========
function respond(bool $ok, ?string $error = null): void {
    echo json_encode(['ok' => $ok] + ($error ? ['error' => $error] : []));
    exit;
}

function clean(string $v): string {
    return trim(strip_tags($v));
}

function valid_email(string $e): bool {
    return (bool) filter_var($e, FILTER_VALIDATE_EMAIL);
}

// Header-Injection-Schutz: reject Newlines in Feldern, die in Mail-Header kommen
function safe_header_field(string $v): bool {
    return !preg_match("/[\r\n]/", $v);
}

// ========== METHODE PRÜFEN ==========
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    respond(false, 'method_not_allowed');
}

// ========== RATE LIMITING ==========
$ip = $_SERVER['HTTP_CF_CONNECTING_IP']
   ?? $_SERVER['HTTP_X_FORWARDED_FOR']
   ?? $_SERVER['REMOTE_ADDR']
   ?? 'unknown';
$ip_hash = md5($ip);

if (!is_dir($CONFIG['rate_limit_dir'])) {
    @mkdir($CONFIG['rate_limit_dir'], 0755, true);
}

$rate_file = $CONFIG['rate_limit_dir'] . '/' . $ip_hash . '.txt';
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
    respond(false, 'rate_limit_exceeded');
}

// ========== HONEYPOT ==========
// Wenn das versteckte Feld "website" ausgefüllt ist -> Bot
if (!empty($_POST['website'])) {
    // Stillschweigend 200 zurück, damit Bots keinen Hinweis bekommen
    respond(true);
}

// ========== EINGABEN VALIDIEREN ==========
$name    = isset($_POST['name'])    ? clean((string) $_POST['name'])    : '';
$email   = isset($_POST['email'])   ? clean((string) $_POST['email'])   : '';
$subject = isset($_POST['subject']) ? clean((string) $_POST['subject']) : '';
$message = isset($_POST['message']) ? clean((string) $_POST['message']) : '';
$consent = !empty($_POST['consent']);

$allowed_subjects = ['general', 'support', 'partnership', 'press', 'feedback'];
$subject_labels = [
    'general'     => 'Allgemeine Anfrage',
    'support'     => 'Support / Hilfe',
    'partnership' => 'Kooperation / Brand',
    'press'       => 'Presseanfrage',
    'feedback'    => 'Feedback',
];

$errors = [];
if ($name === '' || mb_strlen($name) < 2)   { $errors[] = 'name'; }
if (!valid_email($email))                   { $errors[] = 'email'; }
if (!in_array($subject, $allowed_subjects)) { $errors[] = 'subject'; }
if (mb_strlen($message) < 10)               { $errors[] = 'message'; }
if (!$consent)                              { $errors[] = 'consent'; }
if (!safe_header_field($name) || !safe_header_field($email)) {
    $errors[] = 'invalid_chars';
}

if (!empty($errors)) {
    http_response_code(422);
    respond(false, 'validation_failed');
}

// ========== MAIL ZUSAMMENBAUEN ==========
$subject_label = $subject_labels[$subject];
$mail_subject = '[Vouchmi] ' . $subject_label . ' — ' . $name;

$mail_body = "Neue Nachricht über das Vouchmi Kontaktformular\n";
$mail_body .= str_repeat('=', 60) . "\n\n";
$mail_body .= "Name:     " . $name . "\n";
$mail_body .= "E-Mail:   " . $email . "\n";
$mail_body .= "Betreff:  " . $subject_label . "\n";
$mail_body .= "IP:       " . $ip . "\n";
$mail_body .= "Zeit:     " . date('d.m.Y H:i:s') . "\n\n";
$mail_body .= str_repeat('-', 60) . "\n";
$mail_body .= "Nachricht:\n\n";
$mail_body .= $message . "\n\n";
$mail_body .= str_repeat('-', 60) . "\n";
$mail_body .= "Diese Nachricht wurde über das Kontaktformular auf vouchmi.com gesendet.\n";

$headers = [];
$headers[] = 'From: ' . $CONFIG['from_name'] . ' <' . $CONFIG['from_email'] . '>';
$headers[] = 'Reply-To: ' . $name . ' <' . $email . '>';
$headers[] = 'X-Mailer: PHP/' . phpversion();
$headers[] = 'Content-Type: text/plain; charset=UTF-8';
$headers[] = 'Content-Transfer-Encoding: 8bit';

$header_str = implode("\r\n", $headers);

// ========== MAIL SENDEN ==========
$sent = @mail(
    $CONFIG['recipient_email'],
    '=?UTF-8?B?' . base64_encode($mail_subject) . '?=',
    $mail_body,
    $header_str,
    '-f' . $CONFIG['from_email']
);

if (!$sent) {
    error_log('[Vouchmi Contact] mail() failed for ' . $email);
    http_response_code(500);
    respond(false, 'send_failed');
}

// ========== RATE LIMIT UPDATE ==========
$requests[] = $now;
@file_put_contents($rate_file, implode("\n", $requests));

// ========== BESTÄTIGUNG AN USER (optional) ==========
// Kleine Auto-Reply, damit der User weiß, dass die Mail angekommen ist.
$confirm_subject = 'Wir haben deine Nachricht erhalten — Vouchmi';
$confirm_body = "Hallo " . $name . ",\n\n";
$confirm_body .= "vielen Dank für deine Nachricht!\n\n";
$confirm_body .= "Wir haben sie erhalten und melden uns in der Regel innerhalb von 24 Stunden bei dir zurück.\n\n";
$confirm_body .= "Zu deiner Information — folgendes hast du uns geschickt:\n";
$confirm_body .= str_repeat('-', 60) . "\n";
$confirm_body .= "Betreff:  " . $subject_label . "\n\n";
$confirm_body .= $message . "\n";
$confirm_body .= str_repeat('-', 60) . "\n\n";
$confirm_body .= "Viele Grüße\nDein Vouchmi-Team\n\n";
$confirm_body .= "— — — — — — — — — — — — — — — —\n";
$confirm_body .= "Vouchmi · Community Recommendation Marketing\n";
$confirm_body .= "https://vouchmi.com\n";

$confirm_headers = [
    'From: ' . $CONFIG['from_name'] . ' <' . $CONFIG['from_email'] . '>',
    'Reply-To: ' . $CONFIG['recipient_email'],
    'X-Mailer: PHP/' . phpversion(),
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
];

@mail(
    $email,
    '=?UTF-8?B?' . base64_encode($confirm_subject) . '?=',
    $confirm_body,
    implode("\r\n", $confirm_headers),
    '-f' . $CONFIG['from_email']
);

// ========== ERFOLG ==========
respond(true);
