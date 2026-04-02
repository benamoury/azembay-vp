import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bzfthzrbahfgbxkmymdn.supabase.co',
      },
    ],
  },
}

export default nextConfig
