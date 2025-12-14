/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: '.next-clean',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
