import { sqliteAdapter } from '@payloadcms/db-sqlite'
import sharp from 'sharp'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import * as process from 'node:process'

import { createWWWConfig } from '@justanarthur/payload-www/config'
import { name as payloadWwwName } from '@justanarthur/payload-www/package.json'

import { Media } from './collections/Media'
import { Users } from './collections/Users'
import { createPostsCollection } from './collections/createPostsCollection'
import { createCategoriesCollection } from './collections/createCategoriesCollection'
import { createMessagesGlobal } from './collections/(globals)/Messages/createMessagesGlobal'
import { headerFields } from './collections/(globals)/Header/config'
import { footerFields } from './collections/(globals)/Footer/config'
import { Content } from './components/blocks/content/config'
import { Media as MediaBlock } from './components/blocks/media/config'
import { Cta } from './components/blocks/cta/config'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'
import { defaultLocale, locales } from '@/i18n/locales'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const HEADER_RENDER_PATH = '@/components/Header/Component#Header'
const FOOTER_RENDER_PATH = '@/components/Footer/Component#Footer'

const { withWWWConfig } = createWWWConfig()

export default buildConfig(withWWWConfig({
    blocks: [Content, MediaBlock, Cta],

    collections: (defaultCollections) => [
      ...defaultCollections.filter((c) => c.slug !== 'posts'),
      createPostsCollection(),
      createCategoriesCollection(),
      Media,
      Users
    ],

    globals: (defaultGlobals) => {
      const Header = defaultGlobals.find((g) => g.slug === 'header')!
      const Footer = defaultGlobals.find((g) => g.slug === 'footer')!

      return [
        {
          ...Header,
          // ponytail: payload-typegen narrows GlobalConfig `fields` to a strict shape;
          // override with the looser `headerFields` from the lib pattern.
          custom: { [payloadWwwName]: { path: HEADER_RENDER_PATH } },
          fields: headerFields as unknown as typeof Header.fields
        },
        {
          ...Footer,
          custom: { [payloadWwwName]: { path: FOOTER_RENDER_PATH } },
          fields: footerFields as unknown as typeof Footer.fields
        },
        createMessagesGlobal()
      ] as unknown as typeof defaultGlobals
    },

    plugins: (defaultPlugins) => [...defaultPlugins, ...plugins],

    defaultPluginsConfigs: {
      seo: (defaults) => ({
        ...defaults,
        collections: ['pages', 'posts']
      }),
      translator: (defaults) => ({
        ...defaults,
        autoTranslate: true,
        collections: ['pages', 'posts'],
        globals: ['header', 'footer', 'messages']
      })
    },

    editor: defaultLexical,

    localization: {
      defaultLocale,
      fallback: false,
      locales: locales.map((code) => ({ code, label: code.toUpperCase() }))
    },

    cors: [getServerSideURL()].filter(Boolean),
    csrf: [getServerSideURL()].filter(Boolean),

    secret: process.env.PAYLOAD_SECRET || 'demo-secret-change-me',
    db: sqliteAdapter({
      client: { url: process.env.DATABASE_URL || 'file:./demo.db' },
      push: process.env.NODE_ENV !== 'production'
    }),

    sharp,

    typescript: {
      outputFile: path.resolve(dirname, 'payload-types.ts')
    },

    admin: {
      importMap: {
        baseDir: path.resolve(dirname)
      },
      user: Users.slug,
      components: {
        beforeLogin: ['@/components/BeforeLogin'],
        beforeDashboard: ['@/components/BeforeDashboard']
      }
    }
  })
)