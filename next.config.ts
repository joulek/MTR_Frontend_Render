import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";
import path from "path";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

// ⚠️ IMPORTANT : redirection ajoutée ici
const nextConfig: NextConfig = {
  webpack(config) {
    config.resolve.alias["next/font/google"] = path.resolve(__dirname, "./emptyFont.js");
    return config;
  },

  images: {
    unoptimized: true,
    domains: ["localhost"], // 🔥 enlever http:// ici !
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "4000",
        pathname: "/uploads/**",
      },
    ],
  },

  async redirects() {
    return [
      {
        source: "/",        // 🔥 Quand on lance le site
        destination: "/fr", // 👉 On force /fr dans l'URL
        permanent: false,
      },
    ];
  },

  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND}/api/:path*` },
      { source: "/uploads/:path*", destination: `${BACKEND}/uploads/:path*` },
    ];
  },
};

// 🧠 Appliquer le plugin **après**
export default withNextIntl(nextConfig);
