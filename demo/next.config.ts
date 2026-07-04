import { withPayload } from '@payloadcms/next/withPayload'
import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const NEXT_PUBLIC_SERVER_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.__NEXT_PRIVATE_ORIGIN || 'http://localhost:3000'

const nextConfig: NextConfig = {
  
  
  
  
  
  serverExternalPackages: ['@justanarthur/payload-www'],
  
  
  sassOptions: {
    loadPaths: ['./node_modules/@payloadcms/ui/dist/scss/']
  },
  images: {
    localPatterns: [{ pathname: '/api/media/file/**' }],
    qualities: [100],
    remotePatterns: [
      ...[NEXT_PUBLIC_SERVER_URL].map((item) => {
        const url = new URL(item)
        return {
          hostname: url.hostname,
          protocol: url.protocol.replace(':', '') as 'http' | 'https'
        }
      })
    ]
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs']
    }

    webpackConfig.resolve.fallback = {
      ...(webpackConfig.resolve.fallback ?? {}),
      'node:module': false
    }

    return webpackConfig
  },
  reactStrictMode: true,
  turbopack: {
    
    
    
    
    
    root: path.resolve(dirname, '..')
  }
}

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

export default withPayload(withNextIntl(nextConfig), { devBundleServerPackages: false })
