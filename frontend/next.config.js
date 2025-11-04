/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  images: {
    domains: ['localhost'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  },
  // Para Railway: garantir que o build standalone funciona
  experimental: {
    outputFileTracingIncludes: {
      '/api/**': ['./**/*'],
    },
  },
};

module.exports = nextConfig;
