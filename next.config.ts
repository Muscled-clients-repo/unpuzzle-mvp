import type { NextConfig } from "next";
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

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
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
  // Server Actions configuration for file uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb', // Allow up to 500MB for video uploads
    },
  },
  // Webpack configuration (for production builds)
  webpack: (config) => {
    config.watchOptions = {
      ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**', '**/nh-logs/**'],
    };
    
    // Optimize bundle with tree-shaking
    config.optimization = {
      ...config.optimization,
      usedExports: true,
      providedExports: true,
      sideEffects: false,
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

export default withBundleAnalyzer(nextConfig);
