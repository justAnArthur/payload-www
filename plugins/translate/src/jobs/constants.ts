// Slugs the auto-translation job queue uses. Hosts wire these into
// `payload.config.ts → jobs: { tasks: [...], workflows: [...] }`.
// Kept here so the auto-translation surface stays self-contained.

export const TRANSLATE_TASK_SLUG = 'translateEntityToLocale'
export const TRANSLATE_WORKFLOW_SLUG = 'translateEntityToLocales'
