import type { NextConfig } from "next";

// @ts-ignore
const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    // When running on Render, accessing backend via internal private network
    const backendUrl = process.env.BACKEND_HOST ? `http://${process.env.BACKEND_HOST}` : 'http://127.0.0.1:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
