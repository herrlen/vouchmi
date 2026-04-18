import ActivityKit
import SwiftUI
import WidgetKit

// MARK: - Activity Attributes (static data set at start)

struct BrandDropAttributes: ActivityAttributes {
    let dropId: String
    let brandName: String
    let productTitle: String
    let originalPrice: String
    let dropPrice: String
    let communityEmoji: String
    let communityName: String
    let accentColor: String  // hex
    let deepLinkUrl: String
    let endsAt: Date

    // Dynamic state that updates via APNs push
    struct ContentState: Codable, Hashable {
        let participantCount: Int
        let stockClaimed: Int
        let stockRemaining: Int?  // nil = unlimited
        let status: String        // active, ending_soon, sold_out, ended
    }
}

// MARK: - Live Activity Configuration

struct BrandDropLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: BrandDropAttributes.self) { context in
            // Lock Screen / StandBy banner
            LockScreenBanner(attributes: context.attributes, state: context.state)
                .activityBackgroundTint(Color(hex: "#1A1D2E"))
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded: shown when user long-presses the island
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(context.attributes.communityEmoji)
                            .font(.system(size: 20))
                        Text(context.attributes.brandName)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(Color(hex: context.attributes.accentColor))
                            .lineLimit(1)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 2) {
                        CountdownView(endsAt: context.attributes.endsAt, state: context.state)
                        ParticipantBadge(count: context.state.participantCount)
                    }
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.attributes.productTitle)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(2)
                        .multilineTextAlignment(.center)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        PriceBadge(original: context.attributes.originalPrice,
                                   drop: context.attributes.dropPrice)
                        Spacer()
                        StockIndicator(state: context.state)
                    }
                    .padding(.horizontal, 4)
                }
            } compactLeading: {
                // Compact left: emoji
                Text(context.attributes.communityEmoji)
                    .font(.system(size: 14))
            } compactTrailing: {
                // Compact right: countdown
                Text(context.attributes.endsAt, style: .timer)
                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                    .foregroundColor(timerColor(endsAt: context.attributes.endsAt, state: context.state))
                    .frame(minWidth: 44)
                    .multilineTextAlignment(.trailing)
            } minimal: {
                // Minimal: just the V logo
                Text("V")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(Color(hex: "#F59E0B"))
            }
        }
        .supplementalActivityFamilies([.small])
    }
}

// MARK: - Lock Screen Banner

struct LockScreenBanner: View {
    let attributes: BrandDropAttributes
    let state: BrandDropAttributes.ContentState

    var body: some View {
        HStack(spacing: 12) {
            // Left: Brand + Product
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 4) {
                    Text(attributes.communityEmoji)
                        .font(.system(size: 12))
                    Text(attributes.brandName)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(Color(hex: attributes.accentColor))
                        .lineLimit(1)
                }

                Text(attributes.productTitle)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(2)

                PriceBadge(original: attributes.originalPrice, drop: attributes.dropPrice)
            }

            Spacer()

            // Right: Countdown + Stats
            VStack(alignment: .trailing, spacing: 6) {
                CountdownView(endsAt: attributes.endsAt, state: state)
                ParticipantBadge(count: state.participantCount)
                StockIndicator(state: state)
            }
        }
        .padding(16)
    }
}

// MARK: - Subviews

struct CountdownView: View {
    let endsAt: Date
    let state: BrandDropAttributes.ContentState

    var body: some View {
        Text(endsAt, style: .timer)
            .font(.system(size: 16, weight: .bold, design: .monospaced))
            .foregroundColor(timerColor(endsAt: endsAt, state: state))
            .contentTransition(.numericText())
    }
}

struct ParticipantBadge: View {
    let count: Int
    var body: some View {
        HStack(spacing: 3) {
            Text("👥")
                .font(.system(size: 10))
            Text("\(count)")
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(.white)
        }
    }
}

struct PriceBadge: View {
    let original: String
    let drop: String

    var body: some View {
        HStack(spacing: 6) {
            if !original.isEmpty {
                Text(original)
                    .font(.system(size: 11))
                    .strikethrough()
                    .foregroundColor(Color(hex: "#94A3B8"))
            }
            Text(drop)
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(Color(hex: "#F59E0B"))
        }
    }
}

struct StockIndicator: View {
    let state: BrandDropAttributes.ContentState

    var body: some View {
        if let remaining = state.stockRemaining {
            HStack(spacing: 3) {
                Circle()
                    .fill(remaining > 10 ? Color(hex: "#10B981") : Color(hex: "#F472B6"))
                    .frame(width: 6, height: 6)
                Text(remaining > 0 ? "\(remaining) übrig" : "Ausverkauft")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(remaining > 0 ? Color(hex: "#94A3B8") : Color(hex: "#F472B6"))
            }
        }
    }
}

// MARK: - Helpers

func timerColor(endsAt: Date, state: BrandDropAttributes.ContentState) -> Color {
    if state.status == "sold_out" || state.status == "ended" {
        return Color(hex: "#94A3B8")
    }
    let remaining = endsAt.timeIntervalSinceNow
    if remaining < 300 { return Color(hex: "#F472B6") }  // < 5min = pink
    return Color(hex: "#F59E0B")  // amber
}
