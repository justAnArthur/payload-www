import { appearanceOptions, link, type LinkAppearances, type LinkOptions } from '../collections/fields/link'
import { linkGroup } from '../collections/fields/linkGroup'
import { slugField, type SlugFieldOptions } from '../collections/fields/slug'
import { formatSlug, formatSlugSegment, generateSlug, SLUG_LOCK_FIELD, slugFromTitle, slugParent } from '../collections/fields/slug/format'

const fields = { link, linkGroup, appearanceOptions, slugField, formatSlug, formatSlugSegment, generateSlug, slugFromTitle, slugParent }

export default fields
export {
  appearanceOptions,
  formatSlug,
  formatSlugSegment,
  generateSlug,
  link,
  linkGroup,
  SLUG_LOCK_FIELD,
  slugField,
  slugFromTitle,
  slugParent,
  type LinkAppearances,
  type LinkOptions,
  type SlugFieldOptions
}
