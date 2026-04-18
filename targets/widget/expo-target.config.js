/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: "widget",
  name: "VouchmiDaily",
  icon: "../../assets/widget-icon.png",
  colors: {
    $accent: "#F59E0B",
    $background: "#1A1D2E",
  },
  entitlements: {
    "com.apple.security.application-groups": ["group.com.vouchmi.app"],
  },
  deploymentTarget: "16.2",
  frameworks: ["SwiftUI", "WidgetKit", "ActivityKit"],
};
