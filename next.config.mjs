/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
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
