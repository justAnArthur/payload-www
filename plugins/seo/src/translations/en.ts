import type { GenericTranslationsObject } from '@payloadcms/translations'

export const en: GenericTranslationsObject = {
  $schema: './translation-schema.json',
  'plugin-seo': {
    // ----- Group / tabs -----
    metaGroupLabel: 'SEO',
    metaGroupDescription: 'Search engine and social share metadata for this entity.',
    tabContent: 'Content',
    tabSocial: 'Social',
    tabAdvanced: 'Advanced',
    tabPreview: 'Preview',

    // ----- Core field labels -----
    metaTitleLabel: 'Title',
    metaTitleDescription: 'Shown in search results and the browser tab. ~50–60 chars.',
    metaDescriptionLabel: 'Description',
    metaDescriptionDescription: 'Shown under the title in search results. ~100–150 chars.',
    metaKeywordsLabel: 'Keywords',
    metaKeywordsDescription: 'Comma-separated keywords (legacy meta tag, still useful).',
    metaImageLabel: 'Image',
    metaImageDescription: 'Social share / SERP thumbnail.',
    metaImageUrlDescription: 'Public URL of the social share / SERP image.',

    // ----- Social (OG) -----
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
    ogUrlLabel: 'OG url',
    ogUrlDescription: 'Canonical URL surfaced in OG shares (often auto-derived).',
    ogSiteNameLabel: 'OG site name',
    ogLocaleLabel: 'OG locale',
    ogLocaleDescription: 'Locale tag, e.g. "en_US".',

    // ----- Social (Twitter) -----
    twitterCardLabel: 'Twitter card',
    twitterTitleLabel: 'Twitter title',
    twitterTitleDescription: 'Falls back to OG title, then meta title.',
    twitterDescriptionLabel: 'Twitter description',
    twitterImageLabel: 'Twitter image',
    twitterSiteLabel: 'Twitter site',
    twitterSiteDescription: 'Site @handle, e.g. "@yourbrand".',
    twitterCreatorLabel: 'Twitter creator',
    twitterCreatorDescription: 'Author @handle for this entity.',

    // ----- Advanced -----
    advancedLabel: 'Advanced',
    advancedDescription: 'Canonical URL, robots directives, and other low-level meta.',
    canonicalUrlLabel: 'Canonical URL',
    canonicalUrlDescription: 'Overrides the auto-derived canonical. Use absolute URLs.',
    robotsLabel: 'Robots',
    robotsDescription: 'Free-form `meta robots` content, e.g. "index, follow" or "noindex, nofollow".',
    noindexLabel: 'No-index',
    noindexDescription: 'When on, sets `robots` to "noindex, nofollow" and ignores the manual robots field.',
    authorLabel: 'Author',
    publishedAtLabel: 'Published at',
    modifiedAtLabel: 'Modified at',

    // ----- Generate / preview -----
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

    // ----- Length indicator -----
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
    tooShort: 'Too short',
  },
}
