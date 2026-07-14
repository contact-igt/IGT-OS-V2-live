/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // eslint config removed — handled via .eslintrc

  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      '@hello-pangea/dnd',
    ],
  },

  compiler: {
    // Strip console.log in production builds only
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  turbopack: {},

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    config.performance = { hints: false };
    return config;
  },
};

module.exports = nextConfig;
