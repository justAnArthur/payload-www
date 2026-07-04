import { sqliteAdapter } from '@payloadcms/db-sqlite'
import sharp from 'sharp'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import { createWWWConfig } from '@justanarthur/payload-www/with-www-config'

import { Media } from './collections/Media'
import { Categories } from './collections/Categories'
import { Users } from './collections/Users'
import { Content } from './blocks/Content/config'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'
import { routing } from "@/i18n/routing"

const dirname = path.dirname(fileURLToPath(import.meta.url))

const { withWWWConfig } = createWWWConfig({
  locales: routing.locales as any,
  blocks: [Content],
  
  
  linkRelationTo: ['pages', 'posts']
})

export default buildConfig(
  await withWWWConfig({
    admin: {
      components: {
        beforeLogin: ['@/components/BeforeLogin'],
        beforeDashboard: ['@/components/BeforeDashboard']
      },
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      dependencies: {
        content: {
          path: '@/blocks/Content/Component#default',
          type: 'component'
        },
        
        
        
        
        
        
        
        
        
        '@/Header/Component#default': {
          path: '@/Header/Component#default',
          type: 'component'
        },
        '@/Footer/Component#default': {
          path: '@/Footer/Component#default',
          type: 'component'
        }
      },
      importMap: { baseDir: path.resolve(dirname) },
      user: Users.slug
    },
    editor: defaultLexical,
    localization: { locales: ['en', 'uk'], defaultLocale: 'en' },
    db: sqliteAdapter({ client: { url: process.env.DATABASE_URL || '' } }),
    collections: ({ defaultCollections }) => [...defaultCollections, Media, Categories, Users],
    cors: [getServerSideURL].filter(Boolean),
    globals: ({ defaultGlobals }) =>
      defaultGlobals.map((g) => {
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        if (g.slug === 'header') {
          return { ...g, custom: { ...g.custom, path: '@/Header/Component#default' } }
        }
        if (g.slug === 'footer') {
          return { ...g, custom: { ...g.custom, path: '@/Footer/Component#default' } }
        }
        return g
      }),
    plugins,
    secret: process.env.PAYLOAD_SECRET,
    sharp,
    typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') }
  })
)
