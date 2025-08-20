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
  // Webpack configuration (for production builds)
  webpack: (config) => {
    config.watchOptions = {
      ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**', '**/nh-logs/**'],
    };
    return config;
  },
  // Turbopack configuration (now stable, no longer experimental)
  turbopack: {
    // Turbopack will use similar watch ignore patterns
    // Currently Turbopack doesn't have a direct watchOptions equivalent
    // but it automatically ignores node_modules and .git
  },
};

export default nextConfig;
