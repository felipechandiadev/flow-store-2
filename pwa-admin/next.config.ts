import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // experimental: { appDir: true },
  async redirects() {
    return [
      { source: '/ui-components/card', destination: '/ui-components/cards', permanent: true },
    ];
  },
};

export default nextConfig;
