import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return {
      beforeFiles: [
        // Vanity profile URL: /@username → /u/username (user-facing URL stays with @)
        { source: "/@:username", destination: "/u/:username" },
      ],
      afterFiles: [
        { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
        { source: "/sanctum/:path*", destination: `${backendUrl}/sanctum/:path*` },
        { source: "/storage/:path*", destination: `${backendUrl}/storage/:path*` },
      ],
      fallback: [],
    };
  },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "app.vouchmi.com" },
    ],
  },
};

export default nextConfig;
