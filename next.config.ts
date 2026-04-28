import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/cloud/:path*',
        destination: 'https://cloud-worker.mannanteam.workers.dev/cloud/:path*',
        permanent: false,
      },
      {
        source: '/cloud',
        destination: 'https://cloud-worker.mannanteam.workers.dev/',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
