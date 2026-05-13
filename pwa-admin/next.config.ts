import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BACKEND_API_URL:
      process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL || "",
  },
  // experimental: { appDir: true },
  async redirects() {
    return [
      { source: '/ui-components/card', destination: '/ui-components/cards', permanent: true },
    ];
  },
};

export default nextConfig;
