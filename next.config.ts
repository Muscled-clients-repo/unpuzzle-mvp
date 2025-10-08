import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
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
  // Headers for FFmpeg.wasm (SharedArrayBuffer support)
  // Commented out because it breaks CDN video playback
  // FFmpeg will fall back to non-SharedArrayBuffer mode (slower but works)
  // To enable: Configure CDN to send Cross-Origin-Resource-Policy: cross-origin
  // async headers() {
  //   return [
  //     {
  //       source: '/instructor/studio',
  //       headers: [
  //         {
  //           key: 'Cross-Origin-Embedder-Policy',
  //           value: 'require-corp',
  //         },
  //         {
  //           key: 'Cross-Origin-Opener-Policy',
  //           value: 'same-origin',
  //         },
  //       ],
  //     },
  //   ]
  // },
  // Skip TypeScript and ESLint checks during build
  typescript: {
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
