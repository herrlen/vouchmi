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
        { source: "/r/:code", destination: `${backendUrl}/r/:code` },
        { source: "/apple-app-site-association", destination: `${backendUrl}/apple-app-site-association` },
        { source: "/.well-known/apple-app-site-association", destination: `${backendUrl}/.well-known/apple-app-site-association` },
      ],
      fallback: [],
    };
  },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "app.vouchmi.com" },
      { protocol: "https", hostname: "api.vouchmi.com" },
    ],
  },
};

export default nextConfig;
