import type { GlobalConfig } from 'payload'


export type CreateMetadataGlobalOptions = {

  readonly slug?: string

  readonly interfaceName?: string
}


export const METADATA_GLOBAL_DEFAULT_SLUG = 'metadata'


// Drives Organization / WebSite / Product JSON-LD on every page. Fields are grouped
// by their schema.org role so an operator editing one schema doesn't accidentally
// touch another's data. `shared` carries fields reused across all 3 schemas; `organization`
// and `product` hold schema-specific fields. WebSite has no operator-editable data
// beyond shared (inLanguage / publisher / potentialAction are derived or static).
export const createMetadataGlobal = (
  options: CreateMetadataGlobalOptions = {}
): GlobalConfig => {
  const { slug = METADATA_GLOBAL_DEFAULT_SLUG, interfaceName } = options

  return {
    slug,
    admin: {
      description:
        'Site-wide SEO defaults — grouped by JSON-LD schema role. Locale comes from next-intl routing; per-doc fields override these. Drives Organization / WebSite / Product JSON-LD on every page.'
    },
    label: 'Site metadata',
    fields: [
      {
        name: 'shared',
        type: 'group',
        label: 'Shared (Organization + WebSite + Product)',
        admin: {
          description: 'Fields reused across all 3 JSON-LD schemas. Name drives Organization.name, WebSite.name, Product.name and Product.brand.name; logo drives Organization.logo and Product.image.'
        },
        fields: [
          {
            name: 'name',
            type: 'text',
            localized: true,
            label: 'Site name',
            admin: {
              description: 'Brand name as it should appear in OG shares. Drives Organization.name, WebSite.name, Product.name and Product.brand.name in JSON-LD.'
            }
          },
          {
            name: 'description',
            type: 'textarea',
            localized: true,
            label: 'Site description',
            admin: {
              description: 'One-paragraph description of the product. Drives Organization.description, WebSite.description, and Product.description in JSON-LD. ~150-200 chars.'
            }
          },
          {
            name: 'logo',
            type: 'text',
            label: 'Logo URL',
            admin: {
              description: 'Absolute URL of the brand logo (PNG/SVG). Drives Organization.logo and Product.image in JSON-LD.'
            }
          }
        ]
      },
      {
        name: 'organization',
        type: 'group',
        label: 'Organization',
        admin: {
          description: 'Fields unique to the Organization JSON-LD schema.'
        },
        fields: [
          {
            name: 'sameAs',
            type: 'array',
            label: 'Social profile URLs',
            admin: {
              description: 'Canonical social profile URLs (LinkedIn, Twitter, Facebook, Instagram, YouTube, …). Surfaces as Organization.sameAs in JSON-LD — one row per profile.'
            },
            fields: [
              {
                name: 'value',
                type: 'text',
                required: true,
                admin: {
                  description: 'Absolute URL, e.g. https://www.linkedin.com/company/camasys'
                }
              }
            ]
          }
        ]
      },
      {
        name: 'product',
        type: 'group',
        label: 'Product',
        admin: {
          description: 'Fields unique to the Product JSON-LD schema.'
        },
        fields: [
          {
            name: 'offers',
            type: 'group',
            label: 'Product offer',
            admin: {
              description: 'Single Offer description for Product JSON-LD. Camasys uses a "contact us" placeholder by default (price 0, InStock); operators should edit for real pricing.'
            },
            fields: [
              {
                name: 'price',
                type: 'text',
                label: 'Price',
                admin: {
                  description: 'Numeric price as a string (e.g. "0" or "99.00"). Use "0" for contact-sales / free SaaS placeholders.'
                }
              },
              {
                name: 'priceCurrency',
                type: 'text',
                label: 'Currency',
                admin: {
                  description: 'ISO 4217 currency code, e.g. "EUR".'
                }
              },
              {
                name: 'availability',
                type: 'select',
                label: 'Availability',
                defaultValue: 'https://schema.org/InStock',
                options: [
                  { label: 'In stock', value: 'https://schema.org/InStock' },
                  { label: 'Out of stock', value: 'https://schema.org/OutOfStock' },
                  { label: 'Pre-order', value: 'https://schema.org/PreOrder' },
                  { label: 'Discontinued', value: 'https://schema.org/Discontinued' },
                  { label: 'Limited availability', value: 'https://schema.org/LimitedAvailability' },
                  { label: 'Sold out', value: 'https://schema.org/SoldOut' },
                  { label: 'Back order', value: 'https://schema.org/BackOrder' }
                ],
                admin: {
                  description: 'schema.org availability URL. Most B2B SaaS should use InStock + price 0 for "contact us" pricing.'
                }
              }
            ]
          }
        ]
      },
      {
        name: 'twitterSite',
        type: 'text',
        label: 'Twitter site',
        admin: {
          description: 'Site @handle, e.g. "@yourbrand". Surfaces as twitter:site.'
        }
      },
      {
        name: 'twitterCreator',
        type: 'text',
        label: 'Twitter creator',
        admin: {
          description: 'Default author @handle. Surfaces as twitter:creator.'
        }
      },
      {
        name: 'defaultOgImage',
        type: 'text',
        label: 'Default Open Graph image',
        admin: {
          description: 'Absolute URL of the default og:image / twitter:image (1200x630 recommended). Used as fallback when per-page meta fields have no image set.'
        }
      }
    ],
    interfaceName: interfaceName ?? 'MetadataSiteDefaults'
  } as unknown as GlobalConfig
}