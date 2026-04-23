import { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Image, RefreshControl, Dimensions, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useFocusEffect } from "expo-router";
import { ChevronLeft, TrendingUp, BarChart3, MessageCircle, Star, Lock } from "lucide-react-native";
import { colors } from "../src/constants/theme";
import { useAuth } from "../src/lib/store";
import { profile as profileApi, feed as feedApi, analytics as analyticsApi, influencer as influencerApi, type Post, type AnalyticsOverview, type AnalyticsAudience } from "../src/lib/api";

const { width: SCREEN_W } = Dimensions.get("window");
const CHART_W = SCREEN_W - 64;

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "gerade eben";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function AnalyticsScreen() {
  const me = useAuth((s) => s.user);
  const [stats, setStats] = useState({ posts_count: 0, followers_count: 0, following_count: 0, communities_count: 0 });
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [influencerData, setInfluencerData] = useState<AnalyticsOverview | null>(null);
  const [audienceData, setAudienceData] = useState<AnalyticsAudience[]>([]);
  const [influencerActive, setInfluencerActive] = useState(false);

  const isInfluencerRole = me?.role === "influencer";

  const load = useCallback(async () => {
    const [pRes, postsRes] = await Promise.allSettled([
      profileApi.get(),
      feedApi.mine(),
    ]);
    if (pRes.status === "fulfilled") setStats(pRes.value.stats);
    if (postsRes.status === "fulfilled") setRecentPosts(postsRes.value.data.slice(0, 10));

    // Influencer-spezifische Daten laden
    if (isInfluencerRole) {
      try {
        const statusRes = await influencerApi.status();
        setInfluencerActive(statusRes.is_active);
        if (statusRes.is_active) {
          const [overview, audience] = await Promise.allSettled([
            analyticsApi.overview(),
            analyticsApi.audience(),
          ]);
          if (overview.status === "fulfilled") setInfluencerData(overview.value);
          if (audience.status === "fulfilled") setAudienceData(audience.value.communities);
        }
      } catch {}
    }

    setLoading(false);
    setRefreshing(false);
  }, [isInfluencerRole]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(); };

  const initial = (me?.display_name ?? me?.username ?? "?")[0]?.toUpperCase() ?? "?";
  const isInfluencer = me?.role === "influencer";
  const isBrand = me?.role === "brand";
  const dashboardLabel = isBrand ? "Brand Dashboard" : "Creator Dashboard";

  // Calculate total engagement
  const totalLikes = recentPosts.reduce((sum, p) => sum + p.like_count, 0);
  const totalComments = recentPosts.reduce((sum, p) => sum + p.comment_count, 0);
  const totalClicks = recentPosts.reduce((sum, p) => sum + p.click_count, 0);

  // Simple chart data from recent posts (reversed so newest is right)
  const chartData = [...recentPosts].reverse().map((p) => p.like_count + p.comment_count);
  const chartMax = Math.max(1, ...chartData);

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
          <ChevronLeft color="#FFFFFF" size={24} strokeWidth={2} />
        </Pressable>
        <Text style={s.headerTitle}>Analytics</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Dashboard header */}
        <View style={s.dashHeader}>
          <View style={s.dashAvatar}>
            {me?.avatar_url ? (
              <Image source={{ uri: me.avatar_url }} style={s.dashAvatarImg} />
            ) : (
              <Text style={s.dashAvatarInitial}>{initial}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.dashName}>{me?.display_name ?? me?.username}</Text>
            <Text style={s.dashSub}>{dashboardLabel} · Aktiv</Text>
          </View>
          <View style={s.liveBadge}>
            <View style={s.liveDot} />
            <Text style={s.liveText}>Live</Text>
          </View>
        </View>

        {/* KPI Cards - 2 column */}
        <View style={s.kpiRow}>
          <KpiCard label="REICHWEITE" value={formatNumber(stats.followers_count)} accent="#FFFFFF" trend="+18% diese Woche" />
          <KpiCard label="EMPFEHLUNGEN" value={String(stats.posts_count)} accent="#F59E0B" trend={`${recentPosts.length} neu`} />
        </View>

        <View style={s.kpiRow}>
          <KpiCard label="LIKES GESAMT" value={formatNumber(totalLikes)} accent="#F472B6" trend={null} />
          <KpiCard label="KLICKS" value={formatNumber(totalClicks)} accent="#6366F1" trend={null} />
        </View>

        {/* Chart */}
        {chartData.length > 0 && (
          <View style={s.chartCard}>
            <Text style={s.chartTitle}>Engagement über Zeit</Text>
            <Text style={s.chartSub}>Likes + Kommentare pro Post</Text>
            <View style={s.chartArea}>
              {chartData.map((val, i) => {
                const h = Math.max(4, (val / chartMax) * 140);
                const isRecent = i >= chartData.length - 4;
                return (
                  <View key={i} style={s.barCol}>
                    <View style={[s.bar, { height: h, backgroundColor: isRecent ? "#F59E0B" : "#4F46E5", opacity: 0.5 + (i / chartData.length) * 0.5 }]} />
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Influencer Analytics (nur mit aktivem Abo) */}
        {isInfluencerRole && influencerActive && influencerData && (
          <>
            <Text style={s.sectionLabel}>CREATOR ANALYTICS</Text>
            <View style={s.kpiRow}>
              <KpiCard label="KLICKS 7T" value={formatNumber(influencerData.clicks['7d'])} accent="#6366F1" trend={null} />
              <KpiCard label="KLICKS 30T" value={formatNumber(influencerData.clicks['30d'])} accent="#6366F1" trend={null} />
            </View>
            <View style={s.kpiRow}>
              <KpiCard label="ENGAGEMENT" value={formatNumber(influencerData.engagement.likes + influencerData.engagement.comments)} accent="#F472B6" trend={null} />
              <KpiCard label="FOLLOWER" value={formatNumber(influencerData.followers)} accent="#10B981" trend={null} />
            </View>

            {audienceData.length > 0 && (
              <View style={s.chartCard}>
                <Text style={s.chartTitle}>Top Communities</Text>
                <Text style={s.chartSub}>Woher kommt dein Traffic</Text>
                {audienceData.slice(0, 5).map((c) => (
                  <View key={c.id} style={s.audienceRow}>
                    <Text style={s.audienceName} numberOfLines={1}>{c.name}</Text>
                    <Text style={s.audienceClicks}>{c.clicks} Klicks</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* Upsell fuer Nicht-Influencer oder inaktives Abo */}
        {isInfluencerRole && !influencerActive && (
          <View style={s.upsellCard}>
            <Lock color={colors.coral} size={28} />
            <Text style={s.upsellTitle}>Analytics freischalten</Text>
            <Text style={s.upsellDesc}>Dein Influencer-Abo ist inaktiv. Reaktiviere es, um detaillierte Analytics zu sehen.</Text>
            <Pressable style={s.upsellCta} onPress={() => router.push("/influencer-register")}>
              <Text style={s.upsellCtaText}>Abo reaktivieren</Text>
            </Pressable>
          </View>
        )}

        {!isInfluencerRole && me?.role !== "brand" && (
          <View style={s.upsellCard}>
            <BarChart3 color={colors.coral} size={28} />
            <Text style={s.upsellTitle}>Analytics gibt es fuer Creator</Text>
            <View style={s.upsellBenefits}>
              <Text style={s.upsellBenefit}>&#8226; Echtzeit-Klick-Statistiken</Text>
              <Text style={s.upsellBenefit}>&#8226; Direkter Draht zu Brands</Text>
              <Text style={s.upsellBenefit}>&#8226; Creator-Badge im Profil</Text>
            </View>
            <Pressable style={s.upsellCta} onPress={() => router.push("/influencer-register")}>
              <Text style={s.upsellCtaText}>Zu Influencer upgraden — 0,99 EUR/Monat</Text>
            </Pressable>
          </View>
        )}

        {/* Latest recommendations */}
        <Text style={s.sectionLabel}>NEUESTE EMPFEHLUNGEN</Text>
        {recentPosts.slice(0, 5).map((p) => {
          const postInitial = (p.author.display_name ?? p.author.username)[0]?.toUpperCase() ?? "?";
          const avatarColor = ["#F472B6", "#4F46E5", "#10B981", "#F59E0B", "#6366F1"][p.author.username.charCodeAt(0) % 5];
          return (
            <Pressable key={p.id} style={s.recoCard} onPress={() => router.push(`/community/${p.community_id}`)}>
              {p.author.avatar_url ? (
                <Image source={{ uri: p.author.avatar_url }} style={s.recoAvatar} />
              ) : (
                <View style={[s.recoAvatar, { backgroundColor: avatarColor }]}>
                  <Text style={s.recoAvatarInitial}>{postInitial}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.recoTitle} numberOfLines={1}>
                  {p.author.display_name ?? p.author.username} empfiehlt {p.link_title ?? "ein Produkt"}
                </Text>
                <Text style={s.recoMeta}>
                  {p.community?.name ?? "Community"} · {p.like_count} Likes · {timeAgo(p.created_at)}
                </Text>
              </View>
            </Pressable>
          );
        })}

        {recentPosts.length === 0 && (
          <View style={s.emptyReco}>
            <Text style={s.emptyRecoText}>Noch keine Empfehlungen. Teile dein erstes Produkt!</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function KpiCard({ label, value, accent, trend }: { label: string; value: string; accent: string; trend: string | null }) {
  return (
    <View style={s.kpiCard}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={[s.kpiValue, { color: accent }]}>{value}</Text>
      {trend && (
        <View style={s.kpiTrend}>
          <TrendingUp color="#10B981" size={14} strokeWidth={2.5} />
          <Text style={s.kpiTrendText}>{trend}</Text>
        </View>
      )}
    </View>
  );
}

function formatNumber(n: number): string {
  if (n >= 10000) return (n / 1000).toFixed(1).replace(".", ",") + "k";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(".", ",") + "k";
  return String(n);
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0E1A" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 8 },
  backBtn: { minWidth: 44, minHeight: 44, justifyContent: "center" },
  headerTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },

  // Dashboard header
  dashHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  dashAvatar: { width: 52, height: 52, borderRadius: 14, backgroundColor: "#4F46E5", justifyContent: "center", alignItems: "center", overflow: "hidden" },
  dashAvatarImg: { width: 52, height: 52, borderRadius: 14 },
  dashAvatarInitial: { color: "#FFFFFF", fontSize: 24, fontWeight: "800" },
  dashName: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  dashSub: { color: "#94A3B8", fontSize: 13, marginTop: 2 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#10B98118", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981" },
  liveText: { color: "#10B981", fontSize: 13, fontWeight: "700" },

  // KPI
  kpiRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 10 },
  kpiCard: { flex: 1, backgroundColor: "#141926", borderRadius: 20, padding: 18 },
  kpiLabel: { color: "#94A3B8", fontSize: 11, fontWeight: "600", letterSpacing: 1.5, marginBottom: 8 },
  kpiValue: { fontSize: 32, fontWeight: "800" },
  kpiTrend: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 10 },
  kpiTrendText: { color: "#10B981", fontSize: 13, fontWeight: "600" },

  // Chart
  chartCard: { backgroundColor: "#141926", borderRadius: 20, marginHorizontal: 16, marginBottom: 20, padding: 20 },
  chartTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  chartSub: { color: "#94A3B8", fontSize: 13, marginTop: 2, marginBottom: 16 },
  chartArea: { flexDirection: "row", alignItems: "flex-end", height: 150, gap: 4 },
  barCol: { flex: 1, justifyContent: "flex-end" },
  bar: { borderRadius: 4, minHeight: 4 },

  // Section
  sectionLabel: { color: "#94A3B8", fontSize: 12, fontWeight: "600", letterSpacing: 2, paddingHorizontal: 16, marginBottom: 10 },

  // Recent recommendations
  recoCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#141926", borderRadius: 16, marginHorizontal: 16, marginBottom: 8, padding: 14 },
  recoAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  recoAvatarInitial: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  recoTitle: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  recoMeta: { color: "#94A3B8", fontSize: 12, marginTop: 2 },

  emptyReco: { paddingHorizontal: 16, paddingVertical: 24, alignItems: "center" },
  emptyRecoText: { color: "#64748B", fontSize: 14 },

  // Audience rows
  audienceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#1A1D2E" },
  audienceName: { color: "#FFFFFF", fontSize: 14, fontWeight: "600", flex: 1, marginRight: 12 },
  audienceClicks: { color: "#94A3B8", fontSize: 13, fontWeight: "600" },

  // Upsell
  upsellCard: { backgroundColor: "#141926", borderRadius: 20, marginHorizontal: 16, marginBottom: 20, padding: 28, alignItems: "center", borderWidth: 1, borderColor: "#F472B630" },
  upsellTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800", marginTop: 14 },
  upsellDesc: { color: "#94A3B8", fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 20 },
  upsellBenefits: { marginTop: 16, alignSelf: "flex-start", gap: 6 },
  upsellBenefit: { color: "#F8F7F4", fontSize: 14 },
  upsellCta: { backgroundColor: "#F472B6", borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28, marginTop: 20 },
  upsellCtaText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
