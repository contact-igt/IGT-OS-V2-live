import type { NextConfig } from "next";

// Single Next config (the old next.config.js duplicated this and set typescript.ignoreBuildErrors,
// which let type errors ship; type errors now fail the build).
const nextConfig: NextConfig = {
  reactStrictMode: false,

  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@hello-pangea/dnd'],
  },

  compiler: {
    // Strip console.log in production builds only
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },

  turbopack: {},

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, fs: false, net: false, tls: false };
    }
    config.performance = { hints: false };
    return config;
  },
};

export default nextConfig;
