/* =========================================================
   VOUCHMI — Main JavaScript
   - i18n (DE/EN)
   - Cookie Banner
   - Newsletter
   - Mobile Nav
   - Scroll Reveal
   - Sticky Nav
   ========================================================= */

/* ===== I18N TRANSLATIONS ===== */
const TRANSLATIONS = {
  de: {
    'nav.benefits': 'Benefits',
    'nav.how': 'So funktioniert es',
    'nav.features': 'Features',
    'nav.pricing': 'Preise',
    'nav.press': 'Presse',
    'nav.contact': 'Kontakt',
    'nav.download': 'App laden',

    'hero.eyebrow': 'Jetzt im App Store & Play Store',
    'hero.title.1': 'Empfehlungen,',
    'hero.title.highlight': 'denen du vertraust.',
    'hero.title.2': '',
    'hero.sub': 'Vouchmi ist die Community-Plattform, auf der echte Menschen echte Produkte empfehlen. Entdecke Geheimtipps, bevor sie viral gehen — von Freunden, Influencern und Marken, die wirklich zu dir passen.',
    'hero.cta.primary': 'App kostenlos laden',
    'hero.cta.secondary': 'Mehr erfahren',
    'hero.stat1.num': '12.4K',
    'hero.stat1.label': 'Vouchers',
    'hero.stat2.num': '850+',
    'hero.stat2.label': 'Communities',
    'hero.stat3.num': '4.8★',
    'hero.stat3.label': 'App Rating',

    'phone.title': 'Für dich',
    'phone.vouch': 'Empfohlen',
    'phone.product1': 'Bio-Kaffee aus Köln',
    'phone.meta1': 'von Lisa · 234 Vouches',
    'phone.product2': 'Vintage Sneaker Drop',
    'phone.meta2': 'von Tom · 89 Vouches',
    'phone.product3': 'Indie Skincare Brand',
    'phone.meta3': 'von Mira · 412 Vouches',

    'benefits.eyebrow': 'Für jede Rolle',
    'benefits.title': 'Drei Welten, <em>eine</em> Community.',
    'benefits.sub': 'Egal, ob du entdecken, empfehlen oder präsentieren willst — Vouchmi macht es einfacher, transparenter und persönlicher.',

    'benefits.user.tag': 'User',
    'benefits.user.title': 'Entdecke, was wirklich zählt',
    'benefits.user.body': 'Schluss mit Fake-Reviews und gekauften Bewertungen. Bei Vouchmi siehst du, was deine Community wirklich liebt.',
    'benefits.user.list1': 'Personalisierte Empfehlungen aus deinen Communities',
    'benefits.user.list2': 'Speichere Tipps in deine eigene Sammlung',
    'benefits.user.list3': 'Folge Menschen, deren Geschmack du teilst',
    'benefits.user.list4': 'Komplett kostenlos — für immer',

    'benefits.influencer.tag': 'Influencer',
    'benefits.influencer.title': 'Werde gehört. Werde entdeckt.',
    'benefits.influencer.body': 'Promote, was du wirklich liebst — und werde von Marken gefunden, die zu deinem Stil passen.',
    'benefits.influencer.list1': 'Eigenes verifiziertes Profil mit Reichweite',
    'benefits.influencer.list2': 'Affiliate-Links automatisch eingebunden',
    'benefits.influencer.list3': 'Brand-Kollaborationen direkt in der App',
    'benefits.influencer.list4': 'Analytics zu deinen Vouches & Engagement',

    'benefits.brand.tag': 'Brand',
    'benefits.brand.title': 'Sei dort, wo Empfehlungen entstehen',
    'benefits.brand.body': 'Authentisches Marketing über die Community statt aufdringliche Werbung. Deine Marke, organisch verstärkt.',
    'benefits.brand.list1': 'Brand-Profil mit Story, Produkten & Drops',
    'benefits.brand.list2': 'Connect mit passenden Influencern',
    'benefits.brand.list3': 'Detaillierte Analytics & Insights',
    'benefits.brand.list4': 'Nur 0,99 € / Monat — kein Setup, keine Gebühren',

    'how.eyebrow': 'So funktioniert es',
    'how.title': 'In drei Schritten <span class="accent">dabei</span>.',
    'how.sub': 'Schnell installiert, schnell verstanden, schnell Teil der Community.',

    'how.step1.title': 'App laden & Rolle wählen',
    'how.step1.body': 'Lade Vouchmi kostenlos im App Store oder Play Store. Wähle, ob du als User, Influencer oder Brand starten möchtest.',
    'how.step2.title': 'Communities entdecken',
    'how.step2.body': 'Finde Communities zu deinen Interessen — Mode, Tech, Food, Lifestyle. Folge, like, vouche.',
    'how.step3.title': 'Empfehlen & entdeckt werden',
    'how.step3.body': 'Teile deine Lieblingsprodukte, sammle Vouches und werde von Marken oder neuen Followern gefunden.',

    'features.eyebrow': 'Mehrwert',
    'features.title': 'Mehr als nur eine <span class="accent">App.</span>',
    'features.sub': 'Vouchmi vereint die Vorteile von Social Network, Marketplace und Influencer-Plattform — ohne Kompromisse.',

    'features.f1.title': 'Echte Empfehlungen',
    'features.f1.body': 'Keine Bots, keine gekauften Reviews. Jede Empfehlung kommt von einem echten Community-Mitglied.',
    'features.f2.title': 'Smart Communities',
    'features.f2.body': 'Algorithmen, die wirklich für dich arbeiten — basierend auf deinen Interessen, nicht auf Werbebudgets.',
    'features.f3.title': 'Affiliate-Integration',
    'features.f3.body': 'Influencer verdienen automatisch über integrierte Partnerlinks — transparent und fair.',
    'features.f4.title': 'Apple-Native Erlebnis',
    'features.f4.body': 'iOS-Widgets, Live Activities, Dynamic Island — Vouchmi nutzt alles, was iOS bietet.',
    'features.f5.title': 'Sicher & DSGVO-konform',
    'features.f5.body': 'Server in Deutschland, verschlüsselte Kommunikation, vollständige DSGVO-Konformität.',
    'features.f6.title': 'Brand Discovery',
    'features.f6.body': 'Marken zeigen sich der Community organisch — keine aufdringlichen Banner, sondern echte Verbindungen.',

    'screens.eyebrow': 'Screens',
    'screens.title': 'Ein Blick in die <em>App.</em>',
    'screens.sub': 'Designed nach Apple Human Interface Guidelines — schnell, klar, schön.',

    'screen1.label': 'Home Feed',
    'screen1.sub': 'Personalisierte Empfehlungen',
    'screen2.label': 'Community',
    'screen2.sub': 'Beitritt & Diskussion',
    'screen3.label': 'Influencer Profil',
    'screen3.sub': 'Vouches & Reichweite',
    'screen4.label': 'Brand Page',
    'screen4.sub': 'Storefront & Drops',

    'pricing.eyebrow': 'Preise',
    'pricing.title': 'Für User & Influencer <span class="accent">kostenlos.</span>',
    'pricing.sub': 'Vouchmi ist gratis. Nur Brands zahlen einen kleinen Beitrag, um Profil & Tools zu nutzen.',

    'price.user.tier': 'User',
    'price.user.amount': '0',
    'price.user.period': 'für immer kostenlos',
    'price.user.f1': 'Unbegrenzt Empfehlungen entdecken',
    'price.user.f2': 'Communities beitreten',
    'price.user.f3': 'Eigene Sammlung',
    'price.user.f4': 'Folgen & geliked werden',
    'price.user.cta': 'App laden',

    'price.influencer.tier': 'Influencer',
    'price.influencer.amount': '0',
    'price.influencer.period': 'kostenlos · Verifizierung erforderlich',
    'price.influencer.f1': 'Verifiziertes Profil',
    'price.influencer.f2': 'Affiliate-Link-Automation',
    'price.influencer.f3': 'Brand-Kollaborationen',
    'price.influencer.f4': 'Analytics Dashboard',
    'price.influencer.f5': 'WhatsApp 2FA-Schutz',
    'price.influencer.cta': 'Als Influencer starten',

    'price.brand.tier': 'Brand',
    'price.brand.amount': '0,99',
    'price.brand.period': 'pro Monat · jederzeit kündbar · per PayPal',
    'price.brand.f1': 'Brand-Profil mit Story & Produkten',
    'price.brand.f2': 'Influencer-Matching',
    'price.brand.f3': 'Sponsored Drops & Kampagnen',
    'price.brand.f4': 'Detaillierte Analytics',
    'price.brand.f5': 'Priority Support',
    'price.brand.f6': 'Kein Setup, kein Vertrag',
    'price.brand.cta': 'Brand-Profil erstellen',

    'newsletter.title': 'Bleib auf dem Laufenden.',
    'newsletter.sub': 'Neue Features, Brand-Kollaborationen, Tipps aus der Community — einmal im Monat in deinem Postfach.',
    'newsletter.placeholder': 'Deine E-Mail-Adresse',
    'newsletter.btn': 'Anmelden',
    'newsletter.consent': 'Mit der Anmeldung akzeptierst du unsere <a href="datenschutz.html">Datenschutzerklärung</a>. Abmeldung jederzeit möglich.',
    'newsletter.success': '✓ Fast geschafft! Bitte bestätige deine E-Mail über den Link, den wir dir gerade geschickt haben.',
    'newsletter.error': 'Hoppla, da ist etwas schiefgelaufen. Bitte versuche es noch einmal.',

    'press.eyebrow': 'Presse',
    'press.title': 'Für Journalist:innen <span class="accent">& Medien.</span>',
    'press.sub': 'Über Vouchmi schreiben? Hier findest du alles, was du brauchst.',

    'press.kit.title': 'Press Kit',
    'press.kit.body': 'Logos, Brand-Assets, Screenshots in hoher Auflösung und das offizielle Vouchmi Brand-Statement.',
    'press.kit.link': 'Kit herunterladen',

    'press.contact.title': 'Presseanfragen',
    'press.contact.body': 'Interview-Anfragen, Statements oder Hintergrundgespräche mit dem Team.',
    'press.contact.link': 'presse@vouchmi.com',

    'cookie.title': 'Cookies',
    'cookie.body': 'Wir nutzen nur essenzielle Cookies. Optional helfen uns Analyse-Cookies, Vouchmi besser zu machen. Mehr in unserer <a href="datenschutz.html">Datenschutzerklärung</a>.',
    'cookie.accept': 'Alle akzeptieren',
    'cookie.decline': 'Nur essenziell',

    'footer.tagline': 'Community-Empfehlungsmarketing — Trusted by People, Loved by Brands.',
    'footer.product': 'Produkt',
    'footer.product.benefits': 'Benefits',
    'footer.product.features': 'Features',
    'footer.product.pricing': 'Preise',
    'footer.product.download': 'Download',
    'footer.company': 'Unternehmen',
    'footer.company.press': 'Presse',
    'footer.company.contact': 'Kontakt',
    'footer.legal': 'Rechtliches',
    'footer.legal.imprint': 'Impressum',
    'footer.legal.privacy': 'Datenschutz',
    'footer.legal.terms': 'AGB',
    'footer.copyright': '© 2026 Vouchmi. Alle Rechte vorbehalten.',
    'footer.made': 'Made in Hamburg',

    'contact.eyebrow': 'Kontakt',
    'contact.title': 'Lass uns <em>reden.</em>',
    'contact.sub': 'Egal ob Frage, Feedback, Kooperation oder Support — wir freuen uns von dir zu hören.',
    'contact.info.title': 'So erreichst du uns',
    'contact.info.body': 'Antwort meist innerhalb von 24 Stunden an Werktagen. Für Presseanfragen nutze bitte presse@vouchmi.com.',
    'contact.detail.email': 'E-Mail',
    'contact.detail.address': 'Adresse',
    'contact.detail.phone': 'Telefon',

    'contact.form.name': 'Name',
    'contact.form.email': 'E-Mail',
    'contact.form.subject': 'Betreff',
    'contact.form.subject.placeholder': 'Wähle ein Thema…',
    'contact.form.subject.general': 'Allgemeine Anfrage',
    'contact.form.subject.support': 'Support / Hilfe',
    'contact.form.subject.partnership': 'Kooperation / Brand',
    'contact.form.subject.press': 'Presseanfrage',
    'contact.form.subject.feedback': 'Feedback',
    'contact.form.message': 'Deine Nachricht',
    'contact.form.consent': 'Ich akzeptiere die <a href="datenschutz.html">Datenschutzerklärung</a> und stimme der Verarbeitung meiner Daten zur Beantwortung meiner Anfrage zu.',
    'contact.form.submit': 'Nachricht senden',
    'contact.form.success': '✓ Vielen Dank! Wir melden uns so schnell wie möglich bei dir.',
    'contact.form.error': 'Es ist ein Fehler aufgetreten. Bitte versuche es noch einmal oder schreib uns direkt an hello@vouchmi.com.'
  },

  en: {
    'nav.benefits': 'Benefits',
    'nav.how': 'How it works',
    'nav.features': 'Features',
    'nav.pricing': 'Pricing',
    'nav.press': 'Press',
    'nav.contact': 'Contact',
    'nav.download': 'Get the App',

    'hero.eyebrow': 'Now on App Store & Play Store',
    'hero.title.1': 'Recommendations',
    'hero.title.highlight': 'you can trust.',
    'hero.title.2': '',
    'hero.sub': 'Vouchmi is the community platform where real people recommend real products. Discover hidden gems before they go viral — from friends, influencers, and brands that truly fit you.',
    'hero.cta.primary': 'Download free',
    'hero.cta.secondary': 'Learn more',
    'hero.stat1.num': '12.4K',
    'hero.stat1.label': 'Vouchers',
    'hero.stat2.num': '850+',
    'hero.stat2.label': 'Communities',
    'hero.stat3.num': '4.8★',
    'hero.stat3.label': 'App Rating',

    'phone.title': 'For You',
    'phone.vouch': 'Vouched',
    'phone.product1': 'Organic Coffee from Cologne',
    'phone.meta1': 'by Lisa · 234 Vouches',
    'phone.product2': 'Vintage Sneaker Drop',
    'phone.meta2': 'by Tom · 89 Vouches',
    'phone.product3': 'Indie Skincare Brand',
    'phone.meta3': 'by Mira · 412 Vouches',

    'benefits.eyebrow': 'For every role',
    'benefits.title': 'Three worlds, <em>one</em> community.',
    'benefits.sub': 'Whether you want to discover, recommend, or showcase — Vouchmi makes it easier, more transparent, and more personal.',

    'benefits.user.tag': 'User',
    'benefits.user.title': 'Discover what truly matters',
    'benefits.user.body': 'No more fake reviews or paid ratings. On Vouchmi, you see what your community actually loves.',
    'benefits.user.list1': 'Personalized recommendations from your communities',
    'benefits.user.list2': 'Save tips in your own collection',
    'benefits.user.list3': 'Follow people whose taste you share',
    'benefits.user.list4': 'Completely free — forever',

    'benefits.influencer.tag': 'Influencer',
    'benefits.influencer.title': 'Be heard. Be discovered.',
    'benefits.influencer.body': 'Promote what you really love — and get found by brands that match your style.',
    'benefits.influencer.list1': 'Verified profile with built-in reach',
    'benefits.influencer.list2': 'Affiliate links auto-integrated',
    'benefits.influencer.list3': 'Brand collaborations directly in the app',
    'benefits.influencer.list4': 'Analytics on your vouches & engagement',

    'benefits.brand.tag': 'Brand',
    'benefits.brand.title': 'Be where recommendations happen',
    'benefits.brand.body': 'Authentic marketing through community instead of pushy ads. Your brand, organically amplified.',
    'benefits.brand.list1': 'Brand profile with story, products & drops',
    'benefits.brand.list2': 'Connect with matching influencers',
    'benefits.brand.list3': 'Detailed analytics & insights',
    'benefits.brand.list4': 'Just €0.99 / month — no setup, no fees',

    'how.eyebrow': 'How it works',
    'how.title': 'Join in <span class="accent">three steps</span>.',
    'how.sub': 'Quick to install, quick to grasp, quick to belong.',

    'how.step1.title': 'Download & pick a role',
    'how.step1.body': 'Download Vouchmi for free on the App Store or Play Store. Choose to start as a User, Influencer, or Brand.',
    'how.step2.title': 'Discover communities',
    'how.step2.body': 'Find communities for your interests — fashion, tech, food, lifestyle. Follow, like, vouch.',
    'how.step3.title': 'Recommend & be discovered',
    'how.step3.body': 'Share your favorite products, collect vouches, and get found by brands or new followers.',

    'features.eyebrow': 'Why Vouchmi',
    'features.title': 'More than just an <span class="accent">app.</span>',
    'features.sub': 'Vouchmi combines the best of social network, marketplace, and influencer platform — no compromises.',

    'features.f1.title': 'Real recommendations',
    'features.f1.body': 'No bots, no paid reviews. Every recommendation comes from a real community member.',
    'features.f2.title': 'Smart communities',
    'features.f2.body': 'Algorithms that actually work for you — based on your interests, not on ad budgets.',
    'features.f3.title': 'Affiliate integration',
    'features.f3.body': 'Influencers earn automatically via integrated partner links — transparent and fair.',
    'features.f4.title': 'Apple-native experience',
    'features.f4.body': 'iOS Widgets, Live Activities, Dynamic Island — Vouchmi uses everything iOS offers.',
    'features.f5.title': 'Secure & GDPR-compliant',
    'features.f5.body': 'Servers in Germany, encrypted communication, fully GDPR-compliant.',
    'features.f6.title': 'Brand discovery',
    'features.f6.body': 'Brands show themselves to the community organically — no pushy banners, just real connections.',

    'screens.eyebrow': 'Screens',
    'screens.title': 'A look <em>inside.</em>',
    'screens.sub': 'Designed following Apple Human Interface Guidelines — fast, clear, beautiful.',

    'screen1.label': 'Home Feed',
    'screen1.sub': 'Personalized recommendations',
    'screen2.label': 'Community',
    'screen2.sub': 'Join & discuss',
    'screen3.label': 'Influencer Profile',
    'screen3.sub': 'Vouches & reach',
    'screen4.label': 'Brand Page',
    'screen4.sub': 'Storefront & drops',

    'pricing.eyebrow': 'Pricing',
    'pricing.title': 'Free for users <span class="accent">& influencers.</span>',
    'pricing.sub': 'Vouchmi is free. Only brands pay a small fee to use their profile & tools.',

    'price.user.tier': 'User',
    'price.user.amount': '0',
    'price.user.period': 'free forever',
    'price.user.f1': 'Unlimited recommendations',
    'price.user.f2': 'Join communities',
    'price.user.f3': 'Personal collection',
    'price.user.f4': 'Follow & be liked',
    'price.user.cta': 'Get the app',

    'price.influencer.tier': 'Influencer',
    'price.influencer.amount': '0',
    'price.influencer.period': 'free · verification required',
    'price.influencer.f1': 'Verified profile',
    'price.influencer.f2': 'Affiliate link automation',
    'price.influencer.f3': 'Brand collaborations',
    'price.influencer.f4': 'Analytics dashboard',
    'price.influencer.f5': 'WhatsApp 2FA security',
    'price.influencer.cta': 'Start as Influencer',

    'price.brand.tier': 'Brand',
    'price.brand.amount': '0.99',
    'price.brand.period': 'per month · cancel anytime · via PayPal',
    'price.brand.f1': 'Brand profile with story & products',
    'price.brand.f2': 'Influencer matching',
    'price.brand.f3': 'Sponsored drops & campaigns',
    'price.brand.f4': 'Detailed analytics',
    'price.brand.f5': 'Priority support',
    'price.brand.f6': 'No setup, no contract',
    'price.brand.cta': 'Create brand profile',

    'newsletter.title': 'Stay in the loop.',
    'newsletter.sub': 'New features, brand collaborations, community tips — once a month in your inbox.',
    'newsletter.placeholder': 'Your email address',
    'newsletter.btn': 'Subscribe',
    'newsletter.consent': 'By subscribing you accept our <a href="datenschutz.html">privacy policy</a>. Unsubscribe anytime.',
    'newsletter.success': '✓ Almost there! Please confirm your email via the link we just sent you.',
    'newsletter.error': 'Oops, something went wrong. Please try again.',

    'press.eyebrow': 'Press',
    'press.title': 'For journalists <span class="accent">& media.</span>',
    'press.sub': 'Writing about Vouchmi? Find everything you need here.',

    'press.kit.title': 'Press Kit',
    'press.kit.body': 'Logos, brand assets, high-resolution screenshots and the official Vouchmi brand statement.',
    'press.kit.link': 'Download Kit',

    'press.contact.title': 'Press Inquiries',
    'press.contact.body': 'Interview requests, statements or background talks with the team.',
    'press.contact.link': 'presse@vouchmi.com',

    'cookie.title': 'Cookies',
    'cookie.body': 'We only use essential cookies. Optional analytics cookies help us improve Vouchmi. More in our <a href="datenschutz.html">privacy policy</a>.',
    'cookie.accept': 'Accept all',
    'cookie.decline': 'Essential only',

    'footer.tagline': 'Community recommendation marketing — trusted by people, loved by brands.',
    'footer.product': 'Product',
    'footer.product.benefits': 'Benefits',
    'footer.product.features': 'Features',
    'footer.product.pricing': 'Pricing',
    'footer.product.download': 'Download',
    'footer.company': 'Company',
    'footer.company.press': 'Press',
    'footer.company.contact': 'Contact',
    'footer.legal': 'Legal',
    'footer.legal.imprint': 'Imprint',
    'footer.legal.privacy': 'Privacy',
    'footer.legal.terms': 'Terms',
    'footer.copyright': '© 2026 Vouchmi. All rights reserved.',
    'footer.made': 'Made in Hamburg',

    'contact.eyebrow': 'Contact',
    'contact.title': 'Let\'s <em>talk.</em>',
    'contact.sub': 'Question, feedback, partnership or support — we\'d love to hear from you.',
    'contact.info.title': 'How to reach us',
    'contact.info.body': 'Reply usually within 24 hours on weekdays. For press, please use presse@vouchmi.com.',
    'contact.detail.email': 'Email',
    'contact.detail.address': 'Address',
    'contact.detail.phone': 'Phone',

    'contact.form.name': 'Name',
    'contact.form.email': 'Email',
    'contact.form.subject': 'Subject',
    'contact.form.subject.placeholder': 'Pick a topic…',
    'contact.form.subject.general': 'General inquiry',
    'contact.form.subject.support': 'Support / Help',
    'contact.form.subject.partnership': 'Partnership / Brand',
    'contact.form.subject.press': 'Press inquiry',
    'contact.form.subject.feedback': 'Feedback',
    'contact.form.message': 'Your message',
    'contact.form.consent': 'I accept the <a href="datenschutz.html">privacy policy</a> and consent to the processing of my data to answer my request.',
    'contact.form.submit': 'Send message',
    'contact.form.success': '✓ Thank you! We\'ll get back to you as soon as possible.',
    'contact.form.error': 'An error occurred. Please try again or write directly to hello@vouchmi.com.'
  }
};

/* ===== I18N ENGINE ===== */
const I18N_KEY = 'vouchmi-lang';

function getCurrentLang() {
  const saved = localStorage.getItem(I18N_KEY);
  if (saved && TRANSLATIONS[saved]) return saved;
  const browser = (navigator.language || 'de').slice(0,2);
  return TRANSLATIONS[browser] ? browser : 'de';
}

function setLang(lang) {
  if (!TRANSLATIONS[lang]) return;
  localStorage.setItem(I18N_KEY, lang);
  document.documentElement.lang = lang;
  applyTranslations(lang);
  // Update lang switcher visual
  document.querySelectorAll('[data-lang-btn]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.langBtn === lang);
  });
}

function applyTranslations(lang) {
  const dict = TRANSLATIONS[lang];
  if (!dict) return;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (dict[key] !== undefined) el.innerHTML = dict[key];
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    if (dict[key] !== undefined) el.placeholder = dict[key];
  });

  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const key = el.dataset.i18nAria;
    if (dict[key] !== undefined) el.setAttribute('aria-label', dict[key]);
  });
}

/* ===== STICKY NAV ===== */
function initStickyNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  });
}

/* ===== MOBILE NAV ===== */
function initMobileNav() {
  const toggle = document.querySelector('.nav-mobile-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;
  toggle.addEventListener('click', () => links.classList.toggle('open'));
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => links.classList.remove('open'));
  });
}

/* ===== COOKIE BANNER ===== */
const COOKIE_KEY = 'vouchmi-cookie-consent';

function initCookieBanner() {
  const banner = document.querySelector('.cookie-banner');
  if (!banner) return;
  const consent = localStorage.getItem(COOKIE_KEY);
  if (!consent) {
    setTimeout(() => banner.classList.add('show'), 1200);
  }
  document.querySelector('.cookie-accept')?.addEventListener('click', () => {
    localStorage.setItem(COOKIE_KEY, 'all');
    banner.classList.remove('show');
  });
  document.querySelector('.cookie-decline')?.addEventListener('click', () => {
    localStorage.setItem(COOKIE_KEY, 'essential');
    banner.classList.remove('show');
  });
}

/* ===== NEWSLETTER ===== */
function initNewsletter() {
  const form = document.querySelector('#newsletter-form');
  if (!form) return;
  const msg = form.querySelector('.newsletter-msg');
  const lang = getCurrentLang();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const email = data.get('email');
    if (!email || !email.includes('@')) {
      msg.className = 'newsletter-msg error';
      msg.textContent = TRANSLATIONS[getCurrentLang()]['newsletter.error'];
      return;
    }
    try {
      const res = await fetch('newsletter.php', {
        method: 'POST',
        body: data
      });
      const result = await res.json();
      if (result.ok) {
        msg.className = 'newsletter-msg success';
        msg.textContent = TRANSLATIONS[getCurrentLang()]['newsletter.success'];
        form.reset();
      } else {
        msg.className = 'newsletter-msg error';
        msg.textContent = TRANSLATIONS[getCurrentLang()]['newsletter.error'];
      }
    } catch (err) {
      msg.className = 'newsletter-msg error';
      msg.textContent = TRANSLATIONS[getCurrentLang()]['newsletter.error'];
    }
  });
}

/* ===== CONTACT FORM ===== */
function initContactForm() {
  const form = document.querySelector('#contact-form');
  if (!form) return;
  const msg = form.querySelector('.form-msg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.6';

    try {
      const res = await fetch('kontakt.php', {
        method: 'POST',
        body: data
      });
      const result = await res.json();
      if (result.ok) {
        msg.className = 'form-msg success';
        msg.textContent = TRANSLATIONS[getCurrentLang()]['contact.form.success'];
        form.reset();
      } else {
        msg.className = 'form-msg error';
        msg.textContent = TRANSLATIONS[getCurrentLang()]['contact.form.error'];
      }
    } catch (err) {
      msg.className = 'form-msg error';
      msg.textContent = TRANSLATIONS[getCurrentLang()]['contact.form.error'];
    } finally {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
    }
  });
}

/* ===== SCROLL REVEAL ===== */
function initScrollReveal() {
  const elements = document.querySelectorAll('.reveal');
  if (!elements.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  elements.forEach(el => observer.observe(el));
}

/* ===== LANG SWITCHER WIRING ===== */
function initLangSwitcher() {
  document.querySelectorAll('[data-lang-btn]').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.langBtn));
  });
}

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
  setLang(getCurrentLang());
  initStickyNav();
  initMobileNav();
  initCookieBanner();
  initNewsletter();
  initContactForm();
  initScrollReveal();
  initLangSwitcher();
});
