import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // @ts-expect-error - Next.js turbopack type is missing
    turbopack: {
      root: __dirname,
    },
  },
};

export default nextConfig;
