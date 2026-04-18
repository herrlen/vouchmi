import WidgetKit
import SwiftUI

// MARK: - Widget Configuration

struct VouchmiDailyWidget: Widget {
    let kind: String = "VouchmiDailyWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: RecommendationProvider()) { entry in
            VouchmiDailyWidgetView(entry: entry)
                .containerBackground(for: .widget) {
                    LinearGradient(
                        colors: [Color(hex: "#1A1D2E"), Color(hex: "#252941")],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                }
        }
        .configurationDisplayName("Empfehlung des Tages")
        .description("Frische Produkt-Empfehlungen aus deinen Communities.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
        .contentMarginsDisabled()
    }
}

// MARK: - Data Model

struct WidgetPayload: Codable {
    let uuid: String
    let communityName: String
    let communityEmoji: String
    let communityAccentColor: String
    let productTitle: String
    let productImageLocalPath: String
    let domain: String
    let voucherName: String
    let voucherAvatarLocalPath: String
    let voucherCount: Int
    let deepLinkUrl: String
}

// MARK: - Timeline Provider

struct RecommendationEntry: TimelineEntry {
    let date: Date
    let payload: WidgetPayload?
}

struct RecommendationProvider: TimelineProvider {
    func placeholder(in context: Context) -> RecommendationEntry {
        RecommendationEntry(date: Date(), payload: samplePayload)
    }

    func getSnapshot(in context: Context, completion: @escaping (RecommendationEntry) -> Void) {
        completion(RecommendationEntry(date: Date(), payload: loadFromAppGroup()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<RecommendationEntry>) -> Void) {
        let entry = RecommendationEntry(date: Date(), payload: loadFromAppGroup())
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }

    private func loadFromAppGroup() -> WidgetPayload? {
        guard let defaults = UserDefaults(suiteName: "group.com.vouchmi.app"),
              let jsonString = defaults.string(forKey: "daily_recommendation"),
              let data = jsonString.data(using: .utf8),
              let payload = try? JSONDecoder().decode(WidgetPayload.self, from: data)
        else { return nil }
        return payload
    }

    private var samplePayload: WidgetPayload {
        WidgetPayload(
            uuid: "sample",
            communityName: "Mode-Insider",
            communityEmoji: "👗",
            communityAccentColor: "#F472B6",
            productTitle: "4er Set Tischsets LOU + NOA",
            productImageLocalPath: "",
            domain: "studioluy.de",
            voucherName: "Lena M.",
            voucherAvatarLocalPath: "",
            voucherCount: 42,
            deepLinkUrl: "vouchmi://post/sample"
        )
    }
}

// MARK: - Views

struct VouchmiDailyWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: RecommendationEntry

    var body: some View {
        Group {
            switch family {
            case .systemSmall:
                SmallWidgetView(payload: entry.payload)
            case .systemMedium:
                MediumWidgetView(payload: entry.payload)
            case .accessoryRectangular:
                LockScreenView(payload: entry.payload)
            default:
                Text("Nicht unterstützt")
            }
        }
        .widgetURL(URL(string: entry.payload?.deepLinkUrl ?? "vouchmi://home"))
    }
}

// MARK: - Small Widget (Home Screen)

struct SmallWidgetView: View {
    let payload: WidgetPayload?

    var body: some View {
        if let p = payload {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 6) {
                    Text(p.communityEmoji).font(.system(size: 14))
                    Text(p.communityName)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(Color(hex: p.communityAccentColor))
                        .lineLimit(1)
                    Spacer()
                }

                ProductImage(path: p.productImageLocalPath, height: 70)
                    .cornerRadius(10)

                Text(p.productTitle)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.white)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)

                Spacer(minLength: 0)

                HStack(spacing: 4) {
                    Text("🤝").font(.system(size: 10))
                    Text("\(p.voucherCount)")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Color(hex: "#F59E0B"))
                    Text("empfehlen")
                        .font(.system(size: 10))
                        .foregroundColor(Color(hex: "#94A3B8"))
                }
            }
            .padding(12)
        } else {
            EmptyStateView()
        }
    }
}

// MARK: - Medium Widget (Home Screen)

struct MediumWidgetView: View {
    let payload: WidgetPayload?

    var body: some View {
        if let p = payload {
            HStack(spacing: 12) {
                ProductImage(path: p.productImageLocalPath, height: 120)
                    .frame(width: 120)
                    .cornerRadius(12)

                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 6) {
                        Text(p.communityEmoji)
                        Text(p.communityName)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(Color(hex: p.communityAccentColor))
                    }

                    Text(p.productTitle)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(2)

                    Text(p.domain)
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundColor(Color(hex: "#94A3B8"))

                    Spacer()

                    HStack(spacing: 6) {
                        if !p.voucherAvatarLocalPath.isEmpty {
                            AvatarImage(path: p.voucherAvatarLocalPath)
                                .frame(width: 20, height: 20)
                                .clipShape(Circle())
                        }
                        Text("\(p.voucherName) + \(p.voucherCount) weitere")
                            .font(.system(size: 11))
                            .foregroundColor(Color(hex: "#94A3B8"))
                            .lineLimit(1)
                    }
                }
                Spacer(minLength: 0)
            }
            .padding(14)
        } else {
            EmptyStateView()
        }
    }
}

// MARK: - Lock Screen Widget

struct LockScreenView: View {
    let payload: WidgetPayload?

    var body: some View {
        if let p = payload {
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    Text(p.communityEmoji).font(.system(size: 10))
                    Text(p.communityName)
                        .font(.system(size: 10, weight: .semibold))
                        .lineLimit(1)
                }
                Text(p.productTitle)
                    .font(.system(size: 12, weight: .bold))
                    .lineLimit(2)
                Text("🤝 \(p.voucherCount) empfehlen")
                    .font(.system(size: 10))
            }
            .widgetAccentable()
        } else {
            Text("Vouchmi")
                .font(.system(size: 12, weight: .semibold))
        }
    }
}

// MARK: - Helper Views

struct ProductImage: View {
    let path: String
    let height: CGFloat

    var body: some View {
        if let url = appGroupFileURL(for: path),
           let uiImage = UIImage(contentsOfFile: url.path) {
            Image(uiImage: uiImage)
                .resizable()
                .aspectRatio(contentMode: .fill)
                .frame(height: height)
                .clipped()
        } else {
            Rectangle()
                .fill(Color(hex: "#252941"))
                .frame(height: height)
                .overlay(
                    Text("V")
                        .font(.system(size: height * 0.5, weight: .bold))
                        .foregroundColor(Color(hex: "#F59E0B"))
                )
        }
    }
}

struct AvatarImage: View {
    let path: String
    var body: some View {
        if let url = appGroupFileURL(for: path),
           let uiImage = UIImage(contentsOfFile: url.path) {
            Image(uiImage: uiImage).resizable().scaledToFill()
        } else {
            Circle().fill(Color(hex: "#2E3350"))
        }
    }
}

struct EmptyStateView: View {
    var body: some View {
        VStack(spacing: 8) {
            Text("V")
                .font(.system(size: 32, weight: .bold))
                .foregroundColor(Color(hex: "#F59E0B"))
            Text("Öffne Vouchmi, um\nEmpfehlungen zu laden.")
                .font(.system(size: 11))
                .foregroundColor(Color(hex: "#94A3B8"))
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}

// MARK: - Utilities

func appGroupFileURL(for relativePath: String) -> URL? {
    guard !relativePath.isEmpty,
          let container = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: "group.com.vouchmi.app"
          )
    else { return nil }
    return container.appendingPathComponent(relativePath)
}

extension Color {
    init(hex: String) {
        let clean = hex.replacingOccurrences(of: "#", with: "")
        var rgb: UInt64 = 0
        Scanner(string: clean).scanHexInt64(&rgb)
        self.init(
            red: Double((rgb >> 16) & 0xFF) / 255,
            green: Double((rgb >> 8) & 0xFF) / 255,
            blue: Double(rgb & 0xFF) / 255
        )
    }
}
