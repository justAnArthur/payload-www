/** `pages:12` for a document, `global:header` for a global */
export const entityKey = ({ collectionSlug, globalSlug, id }: {
  collectionSlug?: string
  globalSlug?: string
  id?: number | string
}) => globalSlug ? `global:${globalSlug}` : `${collectionSlug}:${id}`
