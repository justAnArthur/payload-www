import type { GenericTranslationsObject } from '@payloadcms/translations'

export const en: GenericTranslationsObject = {
  $schema: './translation-schema.json',
  'plugin-seo': {
    
    metaGroupLabel: 'SEO',
    metaGroupDescription: 'Search engine and social share metadata for this entity.',
    tabContent: 'Content',
    tabSocial: 'Social',
    tabPreview: 'Preview',

    
    metaTitleLabel: 'Title',
    metaTitleDescription: 'Shown in search results and the browser tab. ~50–60 chars.',
    metaDescriptionLabel: 'Description',
    metaDescriptionDescription: 'Shown under the title in search results. ~100–150 chars.',
    metaKeywordsLabel: 'Keywords',
    metaKeywordsDescription: 'Comma-separated keywords (legacy meta tag, still useful).',
    metaImageLabel: 'Image',
    metaImageDescription: 'Social share / SERP thumbnail.',
    metaImageUrlDescription: 'Public URL of the social share / SERP image.',

    
    socialLabel: 'Social',
    socialDescription: 'Open Graph and Twitter Card metadata. Falls back to the core fields when empty.',
    ogTitleLabel: 'OG title',
    ogTitleDescription: 'Open Graph title. ~40–90 chars.',
    ogDescriptionLabel: 'OG description',
    ogDescriptionDescription: 'Open Graph description. ~100–200 chars.',
    ogImageLabel: 'OG image',
    ogImageUrlDescription: 'Public URL of the Open Graph image.',
    ogTypeLabel: 'OG type',
    ogTypeDescription: 'Open Graph object type — usually "website" or "article".',

    
    twitterCardLabel: 'Twitter card',
    twitterTitleLabel: 'Twitter title',
    twitterTitleDescription: 'Falls back to OG title, then meta title.',
    twitterDescriptionLabel: 'Twitter description',
    twitterImageLabel: 'Twitter image',

    
    metadataGroupLabel: 'Site metadata',
    metadataGroupDescription:
      'Site-wide SEO defaults — grouped by JSON-LD schema role. Locale comes from next-intl routing; per-doc fields override these. Drives Organization / WebSite / Product JSON-LD on every page.',
    sharedGroupLabel: 'Shared (Organization + WebSite + Product)',
    sharedGroupDescription:
      'Fields reused across all 3 JSON-LD schemas. Name drives Organization.name, WebSite.name, Product.name and Product.brand.name; logo drives Organization.logo and Product.image.',
    organizationGroupLabel: 'Organization',
    organizationGroupDescription: 'Fields unique to the Organization JSON-LD schema.',
    productGroupLabel: 'Product',
    productGroupDescription: 'Fields unique to the Product JSON-LD schema.',
    siteNameLabel: 'Site name',
    siteNameDescription:
      'Brand name as it should appear in OG shares. Drives Organization.name, WebSite.name, Product.name and Product.brand.name in JSON-LD.',
    siteDescriptionLabel: 'Site description',
    siteDescriptionDescription:
      'One-paragraph description of the product. Drives Organization.description, WebSite.description, and Product.description in JSON-LD. ~150-200 chars.',
    siteLogoLabel: 'Logo URL',
    siteLogoDescription:
      'Absolute URL of the brand logo (PNG/SVG). Drives Organization.logo and Product.image in JSON-LD.',
    siteSameAsLabel: 'Social profile URLs',
    siteSameAsDescription:
      'Canonical social profile URLs (LinkedIn, Twitter, Facebook, Instagram, YouTube, …). Surfaces as Organization.sameAs in JSON-LD — one row per profile.',
    siteOffersLabel: 'Product offer',
    siteOffersDescription:
      'Single Offer description for Product JSON-LD. Camasys uses a "contact us" placeholder by default (price 0, InStock); operators should edit for real pricing.',
    siteOffersPriceLabel: 'Price',
    siteOffersPriceDescription: 'Numeric price as a string (e.g. "0" or "99.00"). Use "0" for contact-sales / free SaaS placeholders.',
    siteOffersCurrencyLabel: 'Currency',
    siteOffersCurrencyDescription: 'ISO 4217 currency code, e.g. "EUR".',
    siteOffersAvailabilityLabel: 'Availability',
    siteOffersAvailabilityDescription: 'schema.org availability URL. Most B2B SaaS should use InStock + price 0 for "contact us" pricing.',
    twitterSiteLabel: 'Twitter site',
    twitterSiteDescription: 'Site @handle, e.g. "@yourbrand". Surfaces as twitter:site.',
    twitterCreatorLabel: 'Twitter creator',
    twitterCreatorDescription:
      'Default author @handle. Surfaces as twitter:creator.',
    defaultOgImageLabel: 'Default Open Graph image',
    defaultOgImageDescription:
      'Absolute URL of the default og:image / twitter:image (1200x630 recommended). Used as fallback when per-page meta fields have no image set.',

    
    autoGenerate: 'Auto-generate',
    generateAi: 'AI-generate',
    generating: 'Generating…',
    generateError: 'Generation failed: {{error}}',
    checksPassing: '{{current}}/{{max}} checks are passing',
    preview: 'Preview',
    previewDescription: 'Exact result listings may vary based on content and search relevancy.',
    previewSerp: 'Google search preview',
    previewOg: 'Open Graph preview',
    previewTwitter: 'Twitter card preview',
    previewTitlePlaceholder: 'Add a title to see how it looks in search results.',
    previewDescriptionPlaceholder: 'Add a description to see how it looks in search results.',
    robotsLabel: 'Robots',

    
    almostThere: 'Almost there',
    bestPractices: 'best practices',
    characterCount: '{{current}}/{{minLength}}-{{maxLength}} chars, ',
    charactersLeftOver: '{{characters}} left over',
    charactersToGo: '{{characters}} to go',
    charactersTooMany: '{{characters}} too many',
    good: 'Good',
    lengthTipKeywords: 'This should be between {{minLength}} and {{maxLength}} words',
    lengthTipTitle:
      'This should be between {{minLength}} and {{maxLength}} characters. For help in writing quality meta titles, see ',
    lengthTipDescription:
      'This should be between {{minLength}} and {{maxLength}} characters. For help in writing quality meta descriptions, see ',
    missing: 'Missing',
    noImage: 'No image',
    imageAutoGenerationTip: 'Auto-generation will retrieve the selected hero image.',
    tooLong: 'Too long',
    tooShort: 'Too short'
  }
}
