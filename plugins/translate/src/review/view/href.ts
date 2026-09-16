import { formatAdminURL } from 'payload/shared'

import { REVIEW_VIEW_PATH } from '../constants'

/** link inside the review view, dropping empty params */
export const reviewHref = (adminRoute: string, params: Record<string, number | string | undefined>) => {
  const query = new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, number | string] => entry[1] !== undefined && entry[1] !== '')
      .map(([key, value]) => [key, String(value)])
  ).toString()

  return `${formatAdminURL({ adminRoute, path: REVIEW_VIEW_PATH })}${query ? `?${query}` : ''}`
}

export const editHref = (adminRoute: string, { collectionSlug, globalSlug, id }: {
  collectionSlug?: string
  globalSlug?: string
  id?: number | string
}, locale: string) =>
  `${formatAdminURL({
    adminRoute,
    path: globalSlug ? `/globals/${globalSlug}` : `/collections/${collectionSlug}/${id}`
  })}?locale=${locale}`
