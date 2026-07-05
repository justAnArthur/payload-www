import {
  createOpenGraphImageRoute,
  type CreateOpenGraphImageRouteArgs,
  type OpenGraphImageRoute,
  type OpenGraphImageRouteContext,
  type OpenGraphImageRouteParams,
} from '../opengraph-image/createOpenGraphImageRoute'
import { extractSEOMetaForImage, type SEOMetaImageProps } from '../opengraph-image/extractSEOMetaForImage'
import { getCollectionOGImagePath } from '../opengraph-image/getCollectionOGImagePath'

const openGraphImage = {
  createOpenGraphImageRoute,
  extractSEOMetaForImage,
  getCollectionOGImagePath,
}

export default openGraphImage
export { createOpenGraphImageRoute, extractSEOMetaForImage, getCollectionOGImagePath }
export type {
  CreateOpenGraphImageRouteArgs,
  OpenGraphImageRoute,
  OpenGraphImageRouteContext,
  OpenGraphImageRouteParams,
  SEOMetaImageProps,
}