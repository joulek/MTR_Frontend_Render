import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://mtr-backend-render.onrender.com";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "https://mtr-backend-render.onrender.com", pathname: "/uploads/**" },
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
