import type { Access, Field, GlobalConfig } from 'payload'


export type CreateLlmsGlobalOptions = {

  readonly slug?: string

  readonly interfaceName?: string

  /**
   * Collection slugs offered in the per-collection rows. With a list the row is a select,
   * without one a free text field.
   */
  readonly collections?: string[]

  /**
   * Overrides the global's access. Defaults to letting only users of the admin collection
   * (`config.admin.user`) read and update it; the llms.txt routes read it through the local API,
   * which skips access.
   */
  readonly access?: GlobalConfig['access']
}

// any auth collection can log in to the API, but only the admin panel's users edit site settings
export const isAdminUser: Access = ({ req }) =>
  !!req.user && req.user.collection === req.payload.config.admin.user


export const LLMS_GLOBAL_DEFAULT_SLUG = 'llms'


// Editorial overrides for the /llms.txt and /llms-full.txt routes built by
// @justanarthur/payload-www/sitemap. Every field is optional: an empty field falls back to
// the options the route was created with, so adding the global changes nothing until edited.
export const createLlmsGlobal = (
  options: CreateLlmsGlobalOptions = {}
): GlobalConfig => {
  const { slug = LLMS_GLOBAL_DEFAULT_SLUG, interfaceName, collections, access } = options

  const collectionField: Field = collections?.length
    ? { name: 'collection', type: 'select', required: true, options: collections.map(value => ({ label: value, value })) }
    : { name: 'collection', type: 'text', required: true, admin: { description: 'Collection slug, e.g. "pages".' } }

  return {
    slug,
    label: 'llms.txt',
    access: { read: isAdminUser, update: isAdminUser, ...access },
    admin: {
      description:
        'What AI assistants read at /llms.txt and /llms-full.txt (https://llmstxt.org). Empty fields fall back to the defaults set in code.'
    },
    fields: [
      {
        name: 'siteName',
        type: 'text',
        localized: true,
        label: 'Site name',
        admin: { description: 'The "# heading". Defaults to the site name in Site metadata.' }
      },
      {
        name: 'summary',
        type: 'textarea',
        localized: true,
        label: 'Summary',
        admin: { description: 'The "> summary" line: one or two sentences on what the site offers and for whom.' }
      },
      {
        name: 'details',
        type: 'textarea',
        localized: true,
        label: 'Details',
        admin: { description: 'Optional markdown printed between the summary and the page lists.' }
      },
      {
        name: 'showLocales',
        type: 'checkbox',
        label: 'List available languages',
        admin: { description: 'Print the served locales under the summary. Unset keeps the code default.' }
      },
      {
        name: 'collections',
        type: 'array',
        label: 'Sections',
        admin: { description: 'Rename or hide the section a collection is listed under.' },
        fields: [
          collectionField,
          { name: 'title', type: 'text', localized: true, label: 'Section title' },
          { name: 'exclude', type: 'checkbox', label: 'Leave this collection out' }
        ]
      },
      {
        name: 'pathSections',
        type: 'array',
        label: 'Sections by path',
        admin: {
          description: 'Group pages by URL path instead of collection, e.g. /products → "Products". Listed first, in this order; replaces the list set in code.'
        },
        fields: [
          { name: 'path', type: 'text', required: true, admin: { description: 'Path without the locale prefix, e.g. /products.' } },
          { name: 'title', type: 'text', required: true, localized: true, label: 'Section title' }
        ]
      },
      {
        name: 'exclude',
        type: 'array',
        label: 'Excluded pages',
        admin: { description: 'Pages to leave out, by document id, slug, path (/pricing) or full URL.' },
        fields: [{ name: 'value', type: 'text', required: true }]
      },
      {
        name: 'extra',
        type: 'textarea',
        localized: true,
        label: 'Extra section',
        admin: { description: 'Markdown appended at the end, e.g. "## Optional" with further links.' }
      }
    ],
    interfaceName: interfaceName ?? 'LlmsSettings'
  } as unknown as GlobalConfig
}
