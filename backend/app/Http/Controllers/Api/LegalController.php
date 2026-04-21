<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

/**
 * Liefert die rechtlichen Texte. Inhalte sind hier inline gepflegt;
 * Updates erfordern Code-Deploy. Letzte redaktionelle Änderung über
 * UPDATED_AT-Konstante steuern, damit die App eine Versionsanzeige
 * machen kann.
 */
class LegalController extends Controller
{
    private const COMPANY = 'Len Messerschmidt e.K.';
    private const ADDRESS = 'Norderreihe 21, 22767 Hamburg';
    private const EMAIL   = 'kontakt@vouchmi.com';
    private const UPDATED = '2026-04-14';

    public function privacy(): JsonResponse
    {
        return $this->doc('Datenschutzerklärung', $this->privacyText());
    }

    public function terms(): JsonResponse
    {
        return $this->doc('Allgemeine Geschäftsbedingungen', $this->termsText());
    }

    public function imprint(): JsonResponse
    {
        return $this->doc('Impressum', $this->imprintText());
    }

    private function doc(string $title, string $content): JsonResponse
    {
        return response()->json([
            'title'      => $title,
            'updated_at' => self::UPDATED,
            'content'    => trim($content),
        ]);
    }

    private function imprintText(): string
    {
        $c = self::COMPANY;
        $a = self::ADDRESS;
        $e = self::EMAIL;
        return <<<MD
# Impressum

## Angaben gemäß § 5 TMG

{$c}
{$a}

## Kontakt

E-Mail: {$e}

## Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV

Len Messerschmidt
{$a}

## Streitschlichtung

Die Europäische Kommission stellt eine Plattform zur
Online-Streitbeilegung (OS) bereit:
https://ec.europa.eu/consumers/odr/

Wir sind nicht bereit oder verpflichtet, an
Streitbeilegungsverfahren vor einer Verbraucher-
schlichtungsstelle teilzunehmen.

## Haftung für Inhalte

Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene
Inhalte auf diesen Seiten nach den allgemeinen Gesetzen
verantwortlich. Nach §§ 8 bis 10 TMG sind wir als
Diensteanbieter jedoch nicht verpflichtet, übermittelte oder
gespeicherte fremde Informationen zu überwachen oder nach
Umständen zu forschen, die auf eine rechtswidrige Tätigkeit
hinweisen.
MD;
    }

    private function privacyText(): string
    {
        $c = self::COMPANY;
        $a = self::ADDRESS;
        $e = self::EMAIL;
        return <<<MD
# Datenschutzerklärung

Stand: 14.04.2026

## 1. Verantwortlicher

{$c}
{$a}
E-Mail: {$e}

## 2. Welche Daten wir erheben

Bei der Nutzung von Vouchmi verarbeiten wir folgende Daten:

- **Account-Daten:** E-Mail-Adresse, Username, Anzeigename,
  optionales Profilbild, verschlüsseltes Passwort.
- **Inhalte:** Posts (inkl. geteilter Produkt-Links),
  Kommentare, Likes, Reposts, Direkt- und
  Community-Nachrichten.
- **Community-Mitgliedschaften:** welche Communities du
  erstellst, beitrittst oder verlässt, sowie deine Rolle.
- **Nutzungsdaten:** Zeitstempel, Klicks auf geteilte Links,
  Geräteinformationen (Betriebssystem, App-Version).

## 3. Zweck der Verarbeitung

Wir verarbeiten deine Daten, um:

- den App-Betrieb und deinen Account bereitzustellen,
- deine Inhalte für andere Nutzer sichtbar zu machen,
- Affiliate-Empfehlungen abzurechnen (anonymisiert),
- Missbrauch und Spam zu verhindern.

## 4. Rechtsgrundlage

Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b
DSGVO (Vertragserfüllung) und Art. 6 Abs. 1 lit. f DSGVO
(berechtigtes Interesse an einem sicheren, missbrauchsfreien
Betrieb).

## 5. Speicherdauer

Account- und Inhaltsdaten werden gespeichert, solange dein
Konto besteht. Bei Account-Löschung werden alle personen-
bezogenen Daten unverzüglich entfernt; aggregierte und
anonymisierte Klick-Statistiken können erhalten bleiben.

## 6. Weitergabe an Dritte

Wir geben Daten nur weiter, wenn dies zur Erfüllung des
Vertrages oder gesetzlich notwendig ist:

- **Affiliate-Netzwerke (Awin, weitere):** Beim Klick auf einen
  geteilten Link wird ein Tracking-Parameter mitgesendet, damit
  Empfehlungen dem teilenden Nutzer zugeordnet werden können.
- **Hosting-Provider (project.host):** Verarbeitung im Auftrag
  innerhalb der EU.
- Wir verkaufen keine personenbezogenen Daten.

## 7. Deine Rechte

Du hast jederzeit das Recht auf:

- **Auskunft** (Art. 15 DSGVO),
- **Berichtigung** (Art. 16 DSGVO),
- **Löschung** (Art. 17 DSGVO) – direkt in der App über
  „Einstellungen → Account löschen",
- **Einschränkung der Verarbeitung** (Art. 18 DSGVO),
- **Datenübertragbarkeit** (Art. 20 DSGVO),
- **Widerspruch** gegen die Verarbeitung (Art. 21 DSGVO).

Anfragen richte bitte an: {$e}

## 8. Beschwerderecht

Du hast das Recht, dich bei einer Datenschutz-Aufsichts-
behörde zu beschweren. Zuständig ist:

Der Hamburgische Beauftragte für Datenschutz und
Informationsfreiheit
Ludwig-Erhard-Str. 22, 7. OG, 20459 Hamburg

## 9. Änderungen dieser Erklärung

Wir behalten uns vor, diese Datenschutzerklärung bei
technischen oder rechtlichen Änderungen anzupassen. Die
jeweils aktuelle Version ist in der App jederzeit abrufbar.
MD;
    }

    private function termsText(): string
    {
        $c = self::COMPANY;
        return <<<MD
# Allgemeine Geschäftsbedingungen

Stand: 14.04.2026

## 1. Geltungsbereich

Diese AGB regeln das Verhältnis zwischen {$c}
(„Vouchmi") und den Nutzern der Vouchmi-App.

## 2. Leistung

Vouchmi stellt eine Community-Plattform bereit, auf der Nutzer
Produktempfehlungen, Links und Nachrichten teilen
können. Vouchmi betreibt selbst keinen Shop und ist nicht
Vertragspartner beim Kauf eines empfohlenen Produkts.

## 3. Account & Nutzung

- Die Registrierung ist ab 16 Jahren kostenlos.
- Du bist verpflichtet, deine Zugangsdaten geheim zu halten.
- Du verantwortest alle Inhalte, die du veröffentlichst.

## 4. Verbotene Inhalte

Untersagt sind insbesondere:

- rechts- oder sittenwidrige Inhalte,
- Beleidigungen, Hassrede, Diskriminierung,
- Spam, Phishing, Malware,
- Inhalte, die fremde Urheber-, Marken- oder
  Persönlichkeitsrechte verletzen,
- pornografische oder jugendgefährdende Inhalte,
- Amazon-Affiliate-Links (per System gesperrt).

Verstöße können zur Sperre und/oder Löschung des Accounts
führen.

## 5. Haftung

Vouchmi haftet nur für Vorsatz und grobe Fahrlässigkeit. Für
Inhalte Dritter (insb. von anderen Nutzern veröffentlichte
Posts, externe Links, Produkte beworbener Marken) übernimmt
Vouchmi keine Haftung.

## 6. Kündigung & Account-Löschung

Du kannst deinen Account jederzeit ohne Angabe von Gründen in
der App löschen („Einstellungen → Account löschen"). Vouchmi
kann den Vertrag aus wichtigem Grund fristlos kündigen,
insbesondere bei Verstößen gegen diese AGB.

## 7. Änderungen der AGB

Vouchmi kann diese AGB ändern. Wesentliche Änderungen werden
in der App angezeigt. Widersprichst du nicht innerhalb von
sechs Wochen, gelten die geänderten AGB als angenommen.

## 8. Schlussbestimmungen

Es gilt deutsches Recht. Sollten einzelne Bestimmungen dieser
AGB unwirksam sein, bleibt die Wirksamkeit der übrigen
Bestimmungen unberührt.
MD;
    }
}
