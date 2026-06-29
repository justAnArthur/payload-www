import { createPreviewHandler } from '@justanarthur/payload-www/render-utils'
import { getServerSideURL } from '@/utilities/getURL'

export const GET = createPreviewHandler({
  getServerSideURL,
  secret: process.env.PREVIEW_SECRET || ''
})
