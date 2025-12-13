/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: '.next-clean',
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
