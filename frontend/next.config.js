/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: '.next-clean',
  transpilePackages: ['chroma-js'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
