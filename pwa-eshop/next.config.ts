import type { NextConfig } from "next";
import { buildLanAllowedDevOrigins } from "../shared/next-lan-dev-origins";

const nextConfig: NextConfig = {
  allowedDevOrigins: buildLanAllowedDevOrigins(),
  env: {
    NEXT_PUBLIC_BACKEND_API_URL:
      process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL || "",
  },
  async redirects() {
    return [
      {
        source: "/e-shop/:slug",
        destination: "/",
        permanent: false,
      },
      {
        source: "/e-shop/:slug/:path*",
        destination: "/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
