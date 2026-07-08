import { createWWWCollectionGlobal } from "@justanarthur/payload-www/collections"

export const CATEGORIES_SLUG = 'categories'
export const CATEGORIES_RENDER_PATH = '@/app/(frontend)/(pages)/[locale]/posts/category/[slug]/render'

export const createCategoriesCollection = () => {
  const base = createWWWCollectionGlobal(
    [
      {
        name: 'title',
        type: 'text',
        required: true,
        localized: true
      }
    ],
    {
      slug: CATEGORIES_SLUG,
      renderPath: CATEGORIES_RENDER_PATH,
      isDraft: false
    }
  )

  return {
    ...base,
    admin: {
      ...base.admin,
      useAsTitle: 'title'
    }
  }
}