import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '1gb', // Allow up to 1GB for video uploads
    },
  },
};

export default nextConfig;
