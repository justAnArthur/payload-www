/**
 * Field factories — use these directly in your Payload config:
 *
 *   import { MetaField } from '@justanarthur/payload-plugin-seo/fields'
 *
 *   fields: [TitleField(), MetaField({ relationTo: 'media' })]
 */
import { MetaField } from '../fields/MetaField'
import { AdvancedField } from '../fields/AdvancedField'
import { DescriptionField } from '../fields/DescriptionField'
import { ImageField } from '../fields/ImageField'
import { KeywordsField } from '../fields/KeywordsField'
import { SocialField } from '../fields/SocialField'
import { TitleField } from '../fields/TitleField'

export default {
  MetaField,
  AdvancedField,
  DescriptionField,
  ImageField,
  KeywordsField,
  SocialField,
  TitleField
}

export { MetaField, AdvancedField, DescriptionField, ImageField, KeywordsField, SocialField, TitleField }
