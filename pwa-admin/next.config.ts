import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@flowstore/print-service-client"],
  env: {
    NEXT_PUBLIC_BACKEND_API_URL:
      process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL || "",
  },
  // experimental: { appDir: true },
  async redirects() {
    return [
      { source: '/ui-components/card', destination: '/ui-components/cards', permanent: true },
      { source: '/inventory/products', destination: '/catalog/products', permanent: true },
      { source: '/inventory/products/:path*', destination: '/catalog/products/:path*', permanent: true },
      { source: '/inventory/categories', destination: '/catalog/categories', permanent: true },
      { source: '/inventory/categories/:path*', destination: '/catalog/categories/:path*', permanent: true },
      { source: '/inventory/attributes', destination: '/catalog/attributes', permanent: true },
      { source: '/inventory/attributes/:path*', destination: '/catalog/attributes/:path*', permanent: true },
    ];
  },
};

export default nextConfig;
