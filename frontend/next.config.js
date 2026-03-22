/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: process.env.NEXT_DIST_DIR || '.next-clean',
  images: {
    unoptimized: true,
  },
  transpilePackages: ['chroma-js'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
