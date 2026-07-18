import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: 52428800,
    },
  },
  // Prevent browsers from caching HTML so every deploy is immediately visible
  async headers() {
    return [
      {
        // Apply to all routes except immutable hashed static assets
        source: "/((?!_next/static|_next/image|favicon\\.ico).*)",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" },
          { key: "Pragma",        value: "no-cache" },
          { key: "Expires",       value: "0" },
        ],
      },
      {
        // Turbopack bootstrap loader must never be cached — it references chunk hashes that change every build
        source: "/_next/static/chunks/turbopack(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" },
          { key: "Pragma",        value: "no-cache" },
          { key: "Expires",       value: "0" },
        ],
      },
    ];
  },
};

export default nextConfig;
