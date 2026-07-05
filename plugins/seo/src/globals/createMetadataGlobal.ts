import type { GlobalConfig } from 'payload'


export type CreateMetadataGlobalOptions = {

  readonly slug?: string

  readonly interfaceName?: string
}


export const METADATA_GLOBAL_DEFAULT_SLUG = 'metadata'


export const createMetadataGlobal = (
  options: CreateMetadataGlobalOptions = {}
): GlobalConfig => {
  const { slug = METADATA_GLOBAL_DEFAULT_SLUG, interfaceName } = options

  return {
    slug,
    admin: {
      description:
        'Site-wide SEO defaults — site name and Twitter handles. Locale comes from next-intl routing; per-doc fields override these.'
    },
    label: 'Site metadata',
    fields: [
      {
        name: 'siteName',
        type: 'text',
        localized: true,
        label: 'Site name',
        admin: {
          description: 'Brand name as it should appear in OG shares. Per-doc fallback.'
        }
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
      }
    ],
    interfaceName: interfaceName ?? 'MetadataSiteDefaults'
  } as unknown as GlobalConfig
}
