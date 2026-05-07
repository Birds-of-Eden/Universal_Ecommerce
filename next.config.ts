import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Allow cross-origin requests from specific development origins
  allowedDevOrigins: ['192.168.0.114'],
  // Simple webpack config to prevent system directory scanning
  webpack: (config, { dev }) => {
    if (!dev) {
      // Disable watching during production build
      config.watchOptions = {
        ignored: '**/*',
      };
    }
    return config;
  },
  // Additional build optimizations
  poweredByHeader: false,
  // Disable file system access during build
  serverExternalPackages: ['fs', 'path', 'os'],
};

export default nextConfig;
