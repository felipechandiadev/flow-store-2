import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { buildLanAllowedDevOrigins } from "../shared/next-lan-dev-origins";

const appRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  /** Evita que Turbopack use un lockfile padre (p. ej. ~/dev) y agote RAM en dev. */
  turbopack: {
    root: appRoot,
  },
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
