import type { NextConfig } from "next";
import { buildLanAllowedDevOrigins } from "../shared/next-lan-dev-origins";

const nextConfig: NextConfig = {
  allowedDevOrigins: buildLanAllowedDevOrigins(),
  transpilePackages: ["@flowstore/print-service-client"],
  env: {
    NEXT_PUBLIC_BACKEND_API_URL:
      process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL || "",
  },
  // (sin configuración experimental por ahora)
};

export default nextConfig;
