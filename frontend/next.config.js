/** @type {import('next').NextConfig} */
const isStaticExport = process.env.NEXT_STATIC_EXPORT === 'true'

const nextConfig = {
  ...(isStaticExport && { output: 'export' }),
  distDir: process.env.NEXT_DIST_DIR || (isStaticExport ? '.next-clean' : '.next'),
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
