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
      'Site-wide SEO defaults — site name and Twitter handles. Locale comes from next-intl routing; per-doc fields override these.',
    siteNameLabel: 'Site name',
    siteNameDescription:
      'Brand name as it should appear in OG shares. Per-doc fallback.',
    twitterSiteLabel: 'Twitter site',
    twitterSiteDescription: 'Site @handle, e.g. "@yourbrand". Surfaces as twitter:site.',
    twitterCreatorLabel: 'Twitter creator',
    twitterCreatorDescription:
      'Default author @handle. Surfaces as twitter:creator.',

    
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
