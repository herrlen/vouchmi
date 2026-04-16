import { useCallback, useRef, useState } from "react";
import { View, Text, Image, Pressable, StyleSheet, Dimensions, FlatList, StatusBar, AccessibilityInfo } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Heart, Bookmark, ExternalLink } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { colors } from "../../constants/theme";
import { feed as feedApi, type Post } from "../../lib/api";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

type Props = {
  posts: Post[];
  onBack?: () => void;
};

export default function StoryGallery({ posts, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const postsWithImages = posts.filter((p) => p.link_image);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const idx = viewableItems[0].index ?? 0;
      setActiveIndex(idx);
      AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
        if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      });
    }
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  if (postsWithImages.length === 0) {
    return (
      <View style={[s.emptyContainer, { paddingTop: insets.top + 60 }]}>
        <Text style={s.emptyTitle}>Noch keine Empfehlungen</Text>
        <Text style={s.emptyText}>Teile deine erste Empfehlung in einer Community!</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <FlatList
        ref={listRef}
        data={postsWithImages}
        keyExtractor={(p) => p.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_H}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <StorySlide post={item} topInset={insets.top} bottomInset={insets.bottom} />
        )}
      />

      {/* Pagination dots (right side) */}
      {postsWithImages.length > 1 && (
        <View style={[s.dots, { top: insets.top + 60 }]}>
          {postsWithImages.slice(0, 20).map((_, i) => (
            <View key={i} style={[s.dot, i === activeIndex && s.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

function StorySlide({ post, topInset, bottomInset }: { post: Post; topInset: number; bottomInset: number }) {
  const [liked, setLiked] = useState(post.is_liked ?? false);
  const [bookmarked, setBookmarked] = useState(post.is_bookmarked ?? false);

  const toggleLike = async () => {
    try {
      const { liked: now } = await feedApi.like(post.id);
      setLiked(now);
    } catch {}
  };

  const toggleBookmark = async () => {
    try {
      const { bookmarked: now } = await feedApi.bookmark(post.id);
      setBookmarked(now);
    } catch {}
  };

  return (
    <View style={[s.slide, { height: SCREEN_H }]}>
      <Image source={{ uri: post.link_image! }} style={s.slideImage} />

      {/* Top overlay — author info */}
      <View style={[s.topOverlay, { paddingTop: topInset + 12 }]}>
        <View style={s.authorRow}>
          {post.author.avatar_url ? (
            <Image source={{ uri: post.author.avatar_url }} style={s.authorAvatar} />
          ) : (
            <View style={[s.authorAvatar, s.authorAvatarFallback]}>
              <Text style={s.authorInitial}>{(post.author.display_name ?? post.author.username)[0]?.toUpperCase()}</Text>
            </View>
          )}
          <Text style={s.authorName}>{post.author.display_name ?? post.author.username}</Text>
        </View>
      </View>

      {/* Bottom overlay — title + description */}
      <View style={[s.bottomOverlay, { paddingBottom: bottomInset + 16 }]}>
        {post.link_title && <Text style={s.slideTitle} numberOfLines={2}>{post.link_title}</Text>}
        {post.link_price != null && <Text style={s.slidePrice}>{post.link_price.toFixed(2)} €</Text>}
        {!!post.content && <Text style={s.slideContent} numberOfLines={3}>{post.content}</Text>}
      </View>

      {/* Side actions */}
      <View style={[s.sideActions, { bottom: bottomInset + 80 }]}>
        <Pressable style={s.sideBtn} onPress={toggleLike} hitSlop={8}>
          <Heart color="#fff" fill={liked ? "#EF4444" : "none"} size={26} strokeWidth={1.8} />
          {post.like_count > 0 && <Text style={s.sideBtnCount}>{post.like_count}</Text>}
        </Pressable>
        <Pressable style={s.sideBtn} onPress={toggleBookmark} hitSlop={8}>
          <Bookmark color="#fff" fill={bookmarked ? colors.accent : "none"} size={26} strokeWidth={1.8} />
        </Pressable>
        <Pressable style={s.sideBtn} onPress={() => {
          const url = post.link_affiliate_url ?? post.link_url;
          if (url) router.push(url as any);
        }} hitSlop={8}>
          <ExternalLink color="#fff" size={26} strokeWidth={1.8} />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  slide: { width: SCREEN_W },
  slideImage: { width: "100%", height: "100%", resizeMode: "cover" },

  topOverlay: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "rgba(0,0,0,0.3)" },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  authorAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: "rgba(255,255,255,0.5)" },
  authorAvatarFallback: { backgroundColor: colors.accent, justifyContent: "center", alignItems: "center" },
  authorInitial: { color: "#fff", fontWeight: "800", fontSize: 14 },
  authorName: { color: "#fff", fontSize: 15, fontWeight: "700", textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },

  bottomOverlay: { position: "absolute", bottom: 0, left: 0, right: 80, paddingHorizontal: 16, paddingTop: 40, backgroundColor: "transparent" },
  slideTitle: { color: "#fff", fontSize: 20, fontWeight: "800", lineHeight: 26, textShadowColor: "rgba(0,0,0,0.6)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  slidePrice: { color: colors.accent, fontSize: 16, fontWeight: "700", marginTop: 4, textShadowColor: "rgba(0,0,0,0.6)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  slideContent: { color: "rgba(255,255,255,0.85)", fontSize: 14, lineHeight: 20, marginTop: 6, textShadowColor: "rgba(0,0,0,0.4)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },

  sideActions: { position: "absolute", right: 12, alignItems: "center", gap: 20 },
  sideBtn: { alignItems: "center", minWidth: 44, minHeight: 44, justifyContent: "center" },
  sideBtnCount: { color: "#fff", fontSize: 12, fontWeight: "600", marginTop: 2 },

  dots: { position: "absolute", right: 8, alignItems: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.4)" },
  dotActive: { backgroundColor: colors.accent, width: 8, height: 8, borderRadius: 4 },

  emptyContainer: { flex: 1, alignItems: "center", paddingHorizontal: 32, backgroundColor: colors.bg },
  emptyTitle: { color: colors.white, fontSize: 16, fontWeight: "700", marginBottom: 8 },
  emptyText: { color: colors.gray, fontSize: 14, textAlign: "center", lineHeight: 20 },
});
