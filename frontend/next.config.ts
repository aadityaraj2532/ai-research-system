import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Optimize images if using external image sources
  images: {
    unoptimized: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;
