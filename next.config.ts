import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // KYC uploads (ID front/back, selfie, extra document) go through a server action.
    serverActions: { bodySizeLimit: "25mb" },
  },
};

export default nextConfig;
