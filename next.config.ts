import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

const nextConfig: NextConfig = {
  webpack(config) {
    // 🔥 remplace tous les imports "next/font/google" par une version vide → plus d’appel à Google
    const path = require("path");

config.resolve.alias["next/font/google"] = path.resolve(__dirname, "./emptyFont.js");
    return config;
  },
  images: {
    unoptimized: true,
    domains: ["http://localhost:4000"],
    remotePatterns: [
      { protocol: "https", hostname: "http://localhost:4000", pathname: "/uploads/**" },
    ],
  },
  async rewrites() {
    return [
      { source: "/api/:path*",     destination: `${BACKEND}/api/:path*` },
      { source: "/uploads/:path*", destination: `${BACKEND}/uploads/:path*` },
    ];
  },
};

export default withNextIntl(nextConfig);
