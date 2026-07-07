import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  devIndicators: false,
  // Type-checked in CI (.github/workflows/ci.yml) before merge — skipping the
  // redundant re-check here saves ~15s per Vercel build.
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-a7c89d8a6af64fffb3d7f411335c94b2.r2.dev',
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
