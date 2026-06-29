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
  // The lib's dist transitively imports `next/cache`, `next/headers`, and
  // `node:*` modules through its server-only utilities. Marking the lib
  // as a serverExternalPackage tells Next.js not to bundle it for the
  // browser at all — hosts must import server utilities from the lib's
  // root only inside server components / route handlers.
  serverExternalPackages: ['@justanarthur/payload-www'],
  // Temporarily required on Windows until Next.js fixes Turbopack Sass resolution.
  // See: https://github.com/vercel/next.js/issues/86431
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
    // Turbopack walks up from the compiled file looking for `next/package.json`.
    // In a pnpm/bun workspace, `next` is hoisted to the monorepo root, so we
    // have to point it there explicitly. Without this, dev fails with
    // "We couldn't find the Next.js package (next/package.json) from the
    // project directory".
    root: path.resolve(dirname, '..')
  }
}

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

export default withPayload(withNextIntl(nextConfig), { devBundleServerPackages: false })
