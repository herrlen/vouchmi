import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Share,
  Linking,
  Animated,
  Dimensions,
  FlatList,
  Platform,
  Vibration,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from "expo-router";
import {
  ChevronLeft,
  MoreHorizontal,
  CheckCircle2,
  Globe,
  Building2,
  Users,
  Heart,
} from "lucide-react-native";
import { brand as brandApi, type BrandPublic, type BrandProduct, type BrandPhoto, type Post } from "../../src/lib/api";
import { useAuth } from "../../src/lib/store";
import { colors } from "../../src/constants/theme";
import LinkCard from "../../src/components/LinkCard";

const { width } = Dimensions.get("window");
const HERO_HEIGHT = 200;
const LOGO_SIZE = 80;
const GRID_COL = 2;
const GRID_GAP = 10;
const GRID_TILE = (width - 32 - GRID_GAP) / GRID_COL;

type TabKey = "recos" | "about" | "products" | "photos";

export default function BrandProfileScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const me = useAuth((s) => s.user);

  const [brand, setBrand] = useState<BrandPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<TabKey>("recos");
  const [posts, setPosts] = useState<Post[]>([]);
  const [products, setProducts] = useState<BrandProduct[]>([]);
  const [photos, setPhotos] = useState<BrandPhoto[]>([]);
  const [followBusy, setFollowBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  const loadAll = useCallback(async () => {
    if (!id) return;
    try {
      const [p, recs, prods, phs] = await Promise.all([
        brandApi.profile(id),
        brandApi.posts(id).catch(() => ({ data: [] as Post[], last_page: 1 })),
        brandApi.products(id).catch(() => ({ products: [] as BrandProduct[] })),
        brandApi.photos(id).catch(() => ({ photos: [] as BrandPhoto[] })),
      ]);
      setBrand(p.brand);
      setPosts(recs.data);
      setProducts(prods.products);
      setPhotos(phs.photos);
    } catch (e) {
      setBrand(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const onRefresh = () => { setRefreshing(true); loadAll(); };

  const toggleFollow = async () => {
    if (!brand || followBusy) return;
    if (!me) { router.push("/auth"); return; }
    setFollowBusy(true);
    if (Platform.OS !== "web") Vibration.vibrate(10);
    const wasFollowing = brand.is_followed;
    // Optimistic UI
    setBrand({
      ...brand,
      is_followed: !wasFollowing,
      follower_count: brand.follower_count + (wasFollowing ? -1 : 1),
    });
    try {
      const res = wasFollowing
        ? await brandApi.unfollow(brand.id)
        : await brandApi.follow(brand.id);
      setBrand((b) => b ? { ...b, is_followed: res.is_followed, follower_count: res.follower_count } : b);
    } catch {
      // Rollback
      setBrand((b) => b ? { ...b, is_followed: wasFollowing, follower_count: brand.follower_count } : b);
    } finally {
      setFollowBusy(false);
    }
  };

  const shareBrand = async () => {
    if (!brand) return;
    try {
      await Share.share({
        message: `Schau dir ${brand.brand_name} auf Vouchmi an:\nhttps://vouchmi.com/brand/${brand.brand_slug}`,
      });
    } catch {}
    setMenuOpen(false);
  };

  // Paywall: nur wenn Owner sich sein eigenes Brand-Profil anschaut und KEIN aktives Abo hat
  const showPaywall = brand?.is_owner && !brand?.is_active;

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={["top"]}>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (!brand) {
    return (
      <SafeAreaView style={s.container} edges={["top"]}>
        <View style={s.centerState}>
          <Text style={s.emptyEmoji}>🔍</Text>
          <Text style={s.emptyTitle}>Brand nicht gefunden</Text>
          <Pressable style={s.ctaBtn} onPress={() => router.back()}>
            <Text style={s.ctaBtnText}>Zurück</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (showPaywall) return <Paywall brandName={brand.brand_name} />;

  // Parallax-Interpolation für Header
  const heroTranslate = scrollY.interpolate({
    inputRange: [-HERO_HEIGHT, 0, HERO_HEIGHT],
    outputRange: [HERO_HEIGHT / 2, 0, -HERO_HEIGHT / 3],
    extrapolate: "clamp",
  });
  const heroScale = scrollY.interpolate({
    inputRange: [-HERO_HEIGHT, 0],
    outputRange: [1.6, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Parallax Hero */}
      <Animated.View
        style={[
          s.hero,
          { transform: [{ translateY: heroTranslate }, { scale: heroScale }] },
        ]}
      >
        {brand.cover_url ? (
          <Image source={{ uri: brand.cover_url }} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, s.heroPlaceholder]} />
        )}
        <View style={s.heroOverlay} />
      </Animated.View>

      {/* Back/Menu-Icons über dem Header */}
      <SafeAreaView edges={["top"]} pointerEvents="box-none" style={s.headerBtnsWrap}>
        <Pressable
          onPress={() => router.back()}
          style={s.roundBtn}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Zurück"
        >
          <ChevronLeft color={colors.white} size={24} strokeWidth={2} />
        </Pressable>
        <Pressable
          onPress={() => setMenuOpen((v) => !v)}
          style={s.roundBtn}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Weitere Optionen"
        >
          <MoreHorizontal color={colors.white} size={22} strokeWidth={2} />
        </Pressable>
      </SafeAreaView>

      {menuOpen && (
        <View style={s.menu}>
          <MenuItem label="Teilen" onPress={shareBrand} />
          <MenuItem label="Link kopieren" onPress={() => { setMenuOpen(false); }} />
          {!brand.is_owner && <MenuItem label="Melden" destructive onPress={() => setMenuOpen(false)} />}
        </View>
      )}

      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 60 }}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Spacer für Hero */}
        <View style={{ height: HERO_HEIGHT - LOGO_SIZE / 2 }} />

        {/* Info-Bereich (Logo + Name + Stats + CTA) */}
        <View style={s.infoCard}>
          <View style={s.logoRow}>
            {brand.logo_url ? (
              <Image source={{ uri: brand.logo_url }} style={s.logo} />
            ) : (
              <View style={[s.logo, s.logoFallback]}>
                <Text style={s.logoInitial}>{brand.brand_name[0]?.toUpperCase() ?? "B"}</Text>
              </View>
            )}
            <FollowButton
              brand={brand}
              busy={followBusy}
              onPress={toggleFollow}
              isOwner={brand.is_owner}
            />
          </View>

          <View style={s.nameRow}>
            <Text style={s.brandName} numberOfLines={2}>{brand.brand_name}</Text>
            {brand.is_verified && (
              <CheckCircle2 color={colors.success} size={20} strokeWidth={2.4} />
            )}
          </View>

          {brand.industry && (
            <View style={s.metaRow}>
              <Building2 color={colors.gray} size={14} strokeWidth={2} />
              <Text style={s.metaText}>{brand.industry}</Text>
            </View>
          )}

          {brand.website_url && (
            <Pressable
              style={s.metaRow}
              onPress={() => brand.website_url && Linking.openURL(brand.website_url).catch(() => {})}
              accessibilityRole="link"
            >
              <Globe color={colors.indigo} size={14} strokeWidth={2} />
              <Text style={[s.metaText, { color: colors.indigo }]} numberOfLines={1}>
                {brand.website_url.replace(/^https?:\/\//, "")}
              </Text>
            </Pressable>
          )}

          <View style={s.statsRow}>
            <Stat icon={<Users color={colors.gray} size={14} strokeWidth={2} />} value={formatCount(brand.follower_count)} label="Follower" />
            <Stat icon={<Heart color={colors.gray} size={14} strokeWidth={2} />} value={formatCount(brand.recommendation_count)} label="Empfehlungen" />
          </View>
        </View>

        {/* Sticky Tabs */}
        <View style={s.tabsWrap}>
          {(["recos", "about", "products", "photos"] as TabKey[]).map((t) => (
            <Pressable
              key={t}
              style={s.tab}
              onPress={() => setTab(t)}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t }}
            >
              <Text style={[s.tabText, tab === t && s.tabTextOn]}>
                {t === "recos" ? "Empfehlungen" : t === "about" ? "Über uns" : t === "products" ? "Produkte" : "Fotos"}
              </Text>
              {tab === t && <View style={s.tabUnderline} />}
            </Pressable>
          ))}
        </View>

        {/* Tab-Content */}
        <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
          {tab === "recos" && <RecosTab posts={posts} />}
          {tab === "about" && <AboutTab brand={brand} />}
          {tab === "products" && <ProductsTab products={products} />}
          {tab === "photos" && <PhotosTab photos={photos} />}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

function FollowButton({
  brand, busy, onPress, isOwner,
}: {
  brand: BrandPublic; busy: boolean; onPress: () => void; isOwner: boolean;
}) {
  if (isOwner) {
    return (
      <Pressable
        style={[s.actionBtn, s.actionBtnOutline]}
        onPress={() => router.push("/brand")}
        accessibilityRole="button"
        accessibilityLabel="Brand-Profil bearbeiten"
      >
        <Text style={[s.actionText, { color: colors.accent }]}>Bearbeiten</Text>
      </Pressable>
    );
  }
  const following = brand.is_followed;
  return (
    <Pressable
      style={[s.actionBtn, following ? s.actionBtnOutline : s.actionBtnFilled, busy && { opacity: 0.6 }]}
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={following ? "Entfolgen" : "Folgen"}
    >
      <Text style={[s.actionText, { color: following ? colors.accent : "#0A0E1A" }]}>
        {following ? "Folgst du" : "Folgen"}
      </Text>
    </Pressable>
  );
}

function MenuItem({ label, onPress, destructive }: { label: string; onPress: () => void; destructive?: boolean }) {
  return (
    <Pressable style={s.menuItem} onPress={onPress}>
      <Text style={[s.menuItemText, destructive && { color: colors.red }]}>{label}</Text>
    </Pressable>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <View style={s.stat}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        {icon}
        <Text style={s.statValue}>{value}</Text>
      </View>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function RecosTab({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return (
      <EmptyState
        emoji="💬"
        title="Noch keine Empfehlungen"
        body="Sei der oder die Erste, die diese Brand empfiehlt."
      />
    );
  }
  return (
    <View style={{ gap: 12 }}>
      {posts.map((p) => (
        <View key={p.id} style={s.postCard}>
          <View style={s.postHeader}>
            {p.author.avatar_url ? (
              <Image source={{ uri: p.author.avatar_url }} style={s.postAvatar} />
            ) : (
              <View style={[s.postAvatar, s.postAvatarFallback]}>
                <Text style={s.postAvatarText}>{p.author.username[0]?.toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.postAuthor}>{p.author.display_name || p.author.username}</Text>
              <Text style={s.postMeta}>@{p.author.username}</Text>
            </View>
          </View>
          {!!p.content && <Text style={s.postContent}>{p.content}</Text>}
          {p.link_url && <LinkCard post={p} />}
        </View>
      ))}
    </View>
  );
}

function AboutTab({ brand }: { brand: BrandPublic }) {
  const isEmpty = !brand.description && !brand.website_url && !brand.industry;
  if (isEmpty) {
    return <EmptyState emoji="📝" title="Noch keine Infos" body="Diese Brand hat noch nichts über sich geschrieben." />;
  }
  return (
    <View style={{ gap: 14 }}>
      {!!brand.description && (
        <View style={s.aboutBlock}>
          <Text style={s.aboutLabel}>Über uns</Text>
          <Text style={s.aboutBody}>{brand.description}</Text>
        </View>
      )}
      {!!brand.website_url && (
        <View style={s.aboutBlock}>
          <Text style={s.aboutLabel}>Website</Text>
          <Pressable onPress={() => brand.website_url && Linking.openURL(brand.website_url)}>
            <Text style={[s.aboutBody, { color: colors.indigo }]}>{brand.website_url}</Text>
          </Pressable>
        </View>
      )}
      {!!brand.industry && (
        <View style={s.aboutBlock}>
          <Text style={s.aboutLabel}>Branche</Text>
          <Text style={s.aboutBody}>{brand.industry}</Text>
        </View>
      )}
    </View>
  );
}

function ProductsTab({ products }: { products: BrandProduct[] }) {
  if (products.length === 0) {
    return <EmptyState emoji="🛍️" title="Keine Produkte" body="Sobald Empfehlungen für Produkte eingehen, tauchen sie hier auf." />;
  }
  return (
    <FlatList
      data={products}
      keyExtractor={(p) => p.link_url}
      numColumns={2}
      columnWrapperStyle={{ gap: GRID_GAP }}
      ItemSeparatorComponent={() => <View style={{ height: GRID_GAP }} />}
      scrollEnabled={false}
      renderItem={({ item }) => (
        <Pressable
          style={s.productCard}
          onPress={() => Linking.openURL(item.link_url).catch(() => {})}
          accessibilityRole="link"
          accessibilityLabel={item.link_title ?? item.link_url}
        >
          {item.link_image ? (
            <Image source={{ uri: item.link_image }} style={s.productImage} />
          ) : (
            <View style={[s.productImage, s.productImageFallback]}>
              <Text style={{ color: colors.grayDark, fontSize: 28 }}>📦</Text>
            </View>
          )}
          <View style={s.productInfo}>
            <Text style={s.productTitle} numberOfLines={2}>{item.link_title ?? item.link_domain}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
              {item.link_price != null ? (
                <Text style={s.productPrice}>{item.link_price.toFixed(2)} €</Text>
              ) : <View />}
              <Text style={s.productCount}>×{item.recommendation_count}</Text>
            </View>
          </View>
        </Pressable>
      )}
    />
  );
}

function PhotosTab({ photos }: { photos: BrandPhoto[] }) {
  if (photos.length === 0) {
    return <EmptyState emoji="📸" title="Keine Fotos" body="Fotos erscheinen hier, sobald Empfehlungen Bilder enthalten." />;
  }
  return (
    <FlatList
      data={photos}
      keyExtractor={(p, i) => `${p.post_id}-${i}`}
      numColumns={3}
      columnWrapperStyle={{ gap: 4 }}
      ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
      scrollEnabled={false}
      renderItem={({ item }) => (
        <Pressable
          style={{ width: (width - 32 - 8) / 3, aspectRatio: 1, borderRadius: 8, overflow: "hidden" }}
          onPress={() => router.push(`/post/${item.post_id}`)}
          accessibilityRole="image"
          accessibilityLabel="Produkt-Foto"
        >
          <Image source={{ uri: item.url }} style={StyleSheet.absoluteFill} />
        </Pressable>
      )}
    />
  );
}

function EmptyState({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <View style={s.emptyBlock}>
      <Text style={{ fontSize: 42, marginBottom: 8 }}>{emoji}</Text>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyBody}>{body}</Text>
    </View>
  );
}

function Paywall({ brandName }: { brandName: string }) {
  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.roundBtn} hitSlop={10}>
          <ChevronLeft color={colors.white} size={24} strokeWidth={2} />
        </Pressable>
        <View style={s.roundBtn} />
      </View>
      <View style={s.paywallContent}>
        <Text style={s.paywallBadge}>🏷️ {brandName}</Text>
        <Text style={s.paywallTitle}>Dein Brand-Profil{"\n"}wartet</Text>
        <Text style={s.paywallBody}>Aktiviere dein Abo, um dein Brand-Profil sichtbar zu machen.</Text>

        <View style={s.benefitList}>
          <Benefit title="Empfehlungen sammeln" body="Jeder Post deiner Produkte erscheint automatisch auf deinem Brand-Profil." />
          <Benefit title="Produkte zeigen" body="Deine meistempfohlenen Artikel werden der Community präsentiert." />
          <Benefit title="Folgen & Analytics" body="Nutzer können dir folgen, du siehst Reichweite und Klicks." />
        </View>

        <Pressable style={s.ctaBtn} onPress={() => router.push("/brand")}>
          <Text style={s.ctaBtnText}>Für 0,99 €/Monat freischalten</Text>
        </Pressable>
        <Text style={s.paywallFoot}>Jederzeit kündbar · PayPal</Text>
      </View>
    </SafeAreaView>
  );
}

function Benefit({ title, body }: { title: string; body: string }) {
  return (
    <View style={s.benefit}>
      <CheckCircle2 color={colors.success} size={20} strokeWidth={2.2} />
      <View style={{ flex: 1 }}>
        <Text style={s.benefitTitle}>{title}</Text>
        <Text style={s.benefitBody}>{body}</Text>
      </View>
    </View>
  );
}

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(n < 10000 ? 1 : 0).replace(".0", "") + "K";
  return (n / 1_000_000).toFixed(1).replace(".0", "") + "M";
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0E1A" },

  hero: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT,
  },
  heroPlaceholder: { backgroundColor: "#141926" },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,14,26,0.35)" },

  headerBtnsWrap: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    zIndex: 10,
  },
  header: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12, paddingTop: 4 },
  roundBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(10,14,26,0.55)",
    marginVertical: 8,
  },

  menu: {
    position: "absolute",
    top: 58, right: 18,
    backgroundColor: "#141926",
    borderRadius: 12,
    paddingVertical: 4,
    minWidth: 170,
    zIndex: 20,
    shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  menuItem: { paddingVertical: 12, paddingHorizontal: 16 },
  menuItemText: { color: colors.white, fontSize: 14, fontWeight: "500" },

  infoCard: {
    backgroundColor: "#0A0E1A",
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  logoRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: -LOGO_SIZE / 2 - 10 },
  logo: {
    width: LOGO_SIZE, height: LOGO_SIZE, borderRadius: 16,
    borderWidth: 2, borderColor: "#141926",
    backgroundColor: "#141926",
  },
  logoFallback: { alignItems: "center", justifyContent: "center" },
  logoInitial: { color: colors.white, fontSize: 34, fontWeight: "800" },

  actionBtn: {
    minHeight: 44,
    paddingHorizontal: 22,
    borderRadius: 22,
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  actionBtnFilled: { backgroundColor: colors.accent },
  actionBtnOutline: { borderWidth: 1.5, borderColor: colors.accent, backgroundColor: "transparent" },
  actionText: { fontSize: 14, fontWeight: "700" },

  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14 },
  brandName: { color: colors.white, fontSize: 22, fontWeight: "800", flexShrink: 1 },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  metaText: { color: colors.gray, fontSize: 13 },

  statsRow: { flexDirection: "row", gap: 20, marginTop: 12 },
  stat: { gap: 2 },
  statValue: { color: colors.white, fontSize: 14, fontWeight: "700" },
  statLabel: { color: colors.gray, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },

  tabsWrap: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1E2435",
    backgroundColor: "#0A0E1A",
  },
  tab: { flex: 1, minHeight: 44, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  tabText: { color: colors.gray, fontSize: 13, fontWeight: "600" },
  tabTextOn: { color: colors.accent },
  tabUnderline: { position: "absolute", bottom: 0, left: 16, right: 16, height: 2.5, backgroundColor: colors.accent, borderRadius: 2 },

  postCard: { backgroundColor: "#141926", borderRadius: 14, padding: 14 },
  postHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  postAvatar: { width: 36, height: 36, borderRadius: 18 },
  postAvatarFallback: { backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  postAvatarText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  postAuthor: { color: colors.white, fontSize: 14, fontWeight: "700" },
  postMeta: { color: colors.gray, fontSize: 11 },
  postContent: { color: colors.white, fontSize: 14, lineHeight: 20, marginBottom: 10 },

  aboutBlock: { backgroundColor: "#141926", borderRadius: 14, padding: 14 },
  aboutLabel: { color: colors.gray, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  aboutBody: { color: colors.white, fontSize: 14, lineHeight: 21 },

  productCard: { width: GRID_TILE, backgroundColor: "#141926", borderRadius: 14, overflow: "hidden" },
  productImage: { width: "100%", aspectRatio: 1 },
  productImageFallback: { backgroundColor: "#1F2435", alignItems: "center", justifyContent: "center" },
  productInfo: { padding: 10 },
  productTitle: { color: colors.white, fontSize: 12, fontWeight: "600", lineHeight: 16 },
  productPrice: { color: colors.accent, fontSize: 13, fontWeight: "700" },
  productCount: { color: colors.gray, fontSize: 11 },

  emptyBlock: { alignItems: "center", paddingVertical: 50 },
  emptyEmoji: { fontSize: 46, marginBottom: 8 },
  emptyTitle: { color: colors.white, fontSize: 16, fontWeight: "700", marginTop: 4 },
  emptyBody: { color: colors.gray, fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 6, maxWidth: 280 },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },

  paywallContent: { flex: 1, padding: 28, justifyContent: "center" },
  paywallBadge: { color: colors.gray, fontSize: 13, textAlign: "center", marginBottom: 12 },
  paywallTitle: { color: colors.white, fontSize: 30, fontWeight: "800", textAlign: "center", lineHeight: 36, letterSpacing: -0.5 },
  paywallBody: { color: colors.gray, fontSize: 14, lineHeight: 22, textAlign: "center", marginTop: 10, marginBottom: 24 },
  benefitList: { gap: 14, marginBottom: 26 },
  benefit: { flexDirection: "row", gap: 12, alignItems: "flex-start", backgroundColor: "#141926", padding: 14, borderRadius: 12 },
  benefitTitle: { color: colors.white, fontSize: 14, fontWeight: "700", marginBottom: 2 },
  benefitBody: { color: colors.gray, fontSize: 12, lineHeight: 18 },
  ctaBtn: { backgroundColor: colors.accent, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  ctaBtnText: { color: "#0A0E1A", fontWeight: "800", fontSize: 15 },
  paywallFoot: { color: colors.grayDark, fontSize: 11, textAlign: "center", marginTop: 10 },
});
