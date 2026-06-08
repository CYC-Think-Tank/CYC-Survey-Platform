import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return {
        afterFiles: [
          {
            source: '/api/:path*',
            destination: 'http://localhost:8000/api/:path*',
          },
        ],
      };
    }
    return [];
  },
};

export default nextConfig;
