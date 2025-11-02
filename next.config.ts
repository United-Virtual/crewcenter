import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
    serverSourceMaps: false,
    browserDebugInfoInTerminal: true,
    webpackMemoryOptimizations: true,
    devtoolSegmentExplorer: true,
  },
  devIndicators: false,
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
};

export default nextConfig;
