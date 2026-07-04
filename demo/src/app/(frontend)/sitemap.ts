import { createSitemapFile } from '@justanarthur/payload-www/render-utils'

import configPromise from '@payload-config'
import { getServerSideURL } from '@/utilities/getURL'


export default createSitemapFile({
  collections: ['pages', 'posts'],
  config: configPromise,
  getServerSideURL,
  localePrefix: 'as-needed',
  urlPrefixes: { posts: '/posts' }
})
