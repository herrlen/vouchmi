import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { ChevronLeft, ChevronDown, ChevronUp } from "lucide-react-native";
import { colors } from "../src/constants/theme";

type FaqItem = { q: string; a: string; roles?: string[] };

const FAQ: { section: string; items: FaqItem[] }[] = [
  {
    section: "Erste Schritte",
    items: [
      {
        q: "Was ist Vouchmi?",
        a: "Vouchmi ist eine Community-Commerce-Plattform. Du trittst Communities bei, teilst Produktempfehlungen mit Freunden und entdeckst Geheimtipps — empfohlen von Menschen, denen du vertraust.",
      },
      {
        q: "Was ist der Unterschied zwischen User, Influencer und Brand?",
        a: "Als User entdeckst und speicherst du Empfehlungen. Als Influencer (Creator) teilst du aktiv Produkte, baust dir eine Community auf und kannst ab Bronze das V-Siegel tragen. Als Brand präsentierst du deine Marke der Community und erreichst authentische Creator.",
      },
      {
        q: "Kann ich meine Rolle später wechseln?",
        a: "Ja! Du startest z.B. als User und steigst automatisch zum Influencer auf, sobald du 1.000 Follower und 25 Empfehlungen hast. Du kannst auch jederzeit ein Brand-Profil hinzufügen.",
      },
    ],
  },
  {
    section: "Communities",
    items: [
      {
        q: "Was sind Communities?",
        a: "Communities sind Gruppen rund um ein Thema — z.B. Mode, Tech oder Fitness. Du kannst bestehenden Communities beitreten oder deine eigene gründen. In jeder Community teilen Mitglieder ihre besten Produktempfehlungen.",
      },
      {
        q: "Wie erstelle ich eine Community?",
        a: "Tippe auf das + Symbol und wähle 'Community erstellen'. Gib einen Namen, eine Beschreibung und optional ein Bild an. Du bist dann automatisch der Owner und kannst Mitglieder einladen.",
      },
      {
        q: "Was sind Community-Rollen?",
        a: "Owner: Hat alle Rechte, kann die Community verwalten. Moderator: Kann Beiträge ausblenden und Mitglieder stummschalten. Mitglied: Kann posten, kommentieren und chatten.",
      },
    ],
  },
  {
    section: "Empfehlungen & Links",
    items: [
      {
        q: "Wie teile ich eine Empfehlung?",
        a: "Tippe auf + und füge einen Produktlink ein. Vouchmi generiert automatisch eine Vorschau mit Bild, Titel und Preis. Dein persönlicher Tracking-Link wird erstellt, damit du sehen kannst, wie oft deine Empfehlung geklickt wird.",
      },
      {
        q: "Was passiert mit meinen Links?",
        a: "Vouchmi erstellt einen Kurzlink (vouchmi.com/r/...) mit UTM-Tracking. So können Marken erkennen, welcher Creator die Klicks gebracht hat. Für dich entstehen keine Kosten.",
      },
      {
        q: "Wo sehe ich meine Link-Statistiken?",
        a: "In den Einstellungen unter 'Meine Links'. Dort siehst du für jeden geteilten Link die Klickzahlen der letzten 30 Tage.",
      },
    ],
  },
  {
    section: "V-Siegel & Tier-System",
    items: [
      {
        q: "Was ist das V-Siegel?",
        a: "Das V-Siegel ist ein Abzeichen, das neben deinem Namen und auf deinem Profilbild erscheint. Es zeigt, dass du ein aktiver Creator bist. Es gibt drei Stufen: Bronze, Silber und Gold.",
        roles: ["influencer"],
      },
      {
        q: "Wie erreiche ich Bronze?",
        a: "Du brauchst mindestens 1.000 Follower und 25 abgegebene Empfehlungen. Sobald du beide Bedingungen erfüllst, wirst du automatisch benachrichtigt und kannst zum Bronze-Creator aufsteigen.",
      },
      {
        q: "Was sind die Tier-Stufen?",
        a: "Bronze: 1.000 Follower + 25 Empfehlungen\nSilber: 10.000 Follower + 200 Empfehlungen\nGold: 100.000 Follower + 1.000 Empfehlungen\n\nBeide Bedingungen müssen gleichzeitig erfüllt sein.",
      },
      {
        q: "Kann ich mein V-Siegel verlieren?",
        a: "Nicht sofort. Wenn deine Follower unter die Schwelle fallen, verblasst das Siegel zunächst schrittweise. Erst wenn du länger als 30 Tage unter 50% der Schwelle bleibst, wirst du auf die nächstniedrigere Stufe zurückgestuft.",
      },
    ],
  },
  {
    section: "Profil & Galerie-Layouts",
    items: [
      {
        q: "Was sind Galerie-Layouts?",
        a: "Du kannst wählen, wie deine Empfehlungen auf deinem Profil dargestellt werden:\n\n• Masonry: Zwei Spalten mit unterschiedlichen Höhen, wie eine Pinnwand.\n• Featured: Ein großes Hauptbild oben, darunter kleinere Bilder im Grid.\n• Story: Ein vertikaler Feed wie im Reco-Bereich.",
      },
      {
        q: "Wie ändere ich mein Galerie-Layout?",
        a: "Gehe zu Einstellungen → Galerie-Layout. Wähle eines der drei Layouts und tippe auf Speichern. Die Änderung ist sofort sichtbar.",
      },
    ],
  },
  {
    section: "Brand-Profil",
    items: [
      {
        q: "Was ist ein Brand-Profil?",
        a: "Mit einem Brand-Profil präsentierst du dein Unternehmen auf Vouchmi. Du erreichst Creator, die deine Produkte authentisch empfehlen. Das Brand-Profil kostet 0,99 € pro Monat.",
        roles: ["brand"],
      },
      {
        q: "Was bekomme ich als Brand?",
        a: "Eine eigene Profilseite mit Logo, Cover-Bild und Beschreibung. Creator können dir folgen. Du siehst Analytics darüber, wie oft deine Produkte empfohlen und geklickt werden.",
        roles: ["brand"],
      },
      {
        q: "Wie kündige ich mein Brand-Abo?",
        a: "Gehe zu Einstellungen → Brand-Profil → Abo kündigen. Die Kündigung wird zum Ende der aktuellen Periode wirksam.",
        roles: ["brand"],
      },
    ],
  },
  {
    section: "Sicherheit & Datenschutz",
    items: [
      {
        q: "Wie kann ich jemanden blockieren?",
        a: "Öffne das Profil der Person und tippe auf das Menü (drei Punkte). Wähle 'Blockieren'. Blockierte Nutzer können dir nicht mehr folgen und du siehst ihre Inhalte nicht mehr.",
      },
      {
        q: "Wie melde ich einen Beitrag?",
        a: "Tippe auf die drei Punkte (⋯) über einem Beitrag und wähle 'Melden'. Wähle einen Grund aus. Unser Team prüft die Meldung.",
      },
      {
        q: "Kann ich meinen Account löschen?",
        a: "Ja, unter Einstellungen → Account löschen. Alle deine Posts, Kommentare, Nachrichten und Community-Mitgliedschaften werden unwiderruflich gelöscht.",
      },
      {
        q: "Wie werden meine Daten verwendet?",
        a: "Vouchmi hängt deinen Username als UTM-Parameter an geteilte Links. So können Marken erkennen, welcher Nutzer die Klicks gebracht hat. Deine persönlichen Daten werden nicht an Dritte verkauft. Mehr dazu in der Datenschutzerklärung.",
      },
    ],
  },
];

export default function HelpScreen() {
  const params = useLocalSearchParams<{ filter?: string }>();
  const roleFilter = params.filter; // "user" | "influencer" | "brand" | undefined

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.iconBtn} hitSlop={10}>
          <ChevronLeft color={colors.white} size={26} strokeWidth={2} />
        </Pressable>
        <Text style={s.title}>Hilfe & FAQ</Text>
        <View style={s.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {roleFilter && (
          <View style={s.filterBadge}>
            <Text style={s.filterText}>
              {roleFilter === "user" ? "Tipps für User" : roleFilter === "influencer" ? "Tipps für Influencer" : "Tipps für Brands"}
            </Text>
          </View>
        )}

        {FAQ.map((section) => {
          const items = roleFilter
            ? section.items.filter((i) => !i.roles || i.roles.includes(roleFilter))
            : section.items;
          if (items.length === 0) return null;
          return (
            <View key={section.section} style={s.section}>
              <Text style={s.sectionTitle}>{section.section}</Text>
              {items.map((item) => (
                <FaqAccordion key={item.q} question={item.q} answer={item.a} />
              ))}
            </View>
          );
        })}

        <View style={s.contactBox}>
          <Text style={s.contactTitle}>Noch Fragen?</Text>
          <Text style={s.contactText}>Schreib uns an support@vouchmi.com — wir helfen dir gerne weiter.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FaqAccordion({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Pressable style={s.faqCard} onPress={() => setOpen((v) => !v)}>
      <View style={s.faqHeader}>
        <Text style={s.faqQuestion}>{question}</Text>
        {open ? <ChevronUp color={colors.gray} size={18} /> : <ChevronDown color={colors.gray} size={18} />}
      </View>
      {open && <Text style={s.faqAnswer}>{answer}</Text>}
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { color: colors.white, fontSize: 18, fontWeight: "700" },
  content: { padding: 16, paddingBottom: 60 },

  filterBadge: { alignSelf: "center", backgroundColor: colors.accent + "20", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 16 },
  filterText: { color: colors.accent, fontSize: 13, fontWeight: "700" },

  section: { marginBottom: 24 },
  sectionTitle: { color: colors.grayDark, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },

  faqCard: { backgroundColor: colors.bgCard, borderRadius: 12, padding: 16, marginBottom: 6 },
  faqHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  faqQuestion: { color: colors.white, fontSize: 15, fontWeight: "600", flex: 1 },
  faqAnswer: { color: colors.gray, fontSize: 14, lineHeight: 21, marginTop: 12, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: colors.border },

  contactBox: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 18, alignItems: "center", marginTop: 8 },
  contactTitle: { color: colors.white, fontSize: 15, fontWeight: "700", marginBottom: 6 },
  contactText: { color: colors.gray, fontSize: 13, lineHeight: 19, textAlign: "center" },
});
