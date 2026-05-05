import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: 'pub-2937173b25a2446ab81694b095fd8d4b.r2.dev',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/cloud{/}?',
        destination: 'https://cloud-worker.mannanteam.workers.dev/',
        permanent: false,
      },
      {
        source: '/vision{/}?',
        destination: 'https://vision-board.mannanteam.workers.dev/',
        permanent: false,
      },
      {
        source: '/github{/}?',
        destination: 'https://github.com/mannanj',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
