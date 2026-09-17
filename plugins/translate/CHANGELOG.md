# Changelog

All notable changes to `@justanarthur/payload-plugin-translator` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- **The translations detail view renders again** (regression in 3.4.0): the per-entity review
  loader stripped the field rows from every locale's result the way the overview does, so
  opening a locale cell crashed the admin with
  `Cannot read properties of undefined (reading 'filter')` — `review.fields` was undefined.
  Field rows now stay on the entity review; the overview strips them where it always did.

- **Short fields copied from another locale are now flagged and retranslated.** The statistical
  wrong-language check only fires on long prose (≥40 chars, ≥5 words), so the damage left by the
  old locale race — one locale's translation filed under another, concentrated in titles,
  headings and labels — was invisible: the translations view showed the locales as fully
  covered and "translate untranslated" had nothing to act on. The review and the untranslated
  retranslation now also treat a value that is byte-identical to the same field in another
  non-close-pair locale (and differs from the source) as wrong language. Values equal to the
  source are excluded, so brands, addresses and shared labels never trigger it.

- **The language detector's locale subset is now set per call.** eld keeps global state, and the
  first `loadWrongLanguageCheck` caller's locale list previously decided what every later caller
  in the process could detect.

- **Edits that only change non-translatable fields now propagate to every locale.**
  The traversal always copied localized relationships/selects (and row-count changes)
  from the source locale into the outgoing payload, but both persist paths skipped the
  write when the resolver had nothing to translate — so switching a nav link from a
  custom URL to an internal document reference in the default locale left every other
  locale holding its stale reference, exposed the moment the shared `type` field
  flipped. The traversal now counts value copies that changed the target
  (`syncedCount` on the result), and both the task and the endpoint persist whenever
  anything was translated *or* synced.

- **Translating a locale that is missing block rows no longer fails required-field
  validation on empty rich text.** Rebuilt localized block rows started as bare
  `id`/`blockType` skeletons, and fields the traversal skips — rich text with no
  translatable text, empty text/json — never made it into the outgoing payload, so a
  required `richText` field failed with
  `ValidationError: The following field is invalid: … RichText`. Rows are now seeded
  from a clone of their source row (existing target values still win), and a top-level
  empty rich text is carried over when the target locale has no value.

- **Concurrent translate jobs can no longer write one locale's translations into another
  locale's rows** (including the default locale). Payload's jobs runner hands every
  concurrently-running job the same `req` object (only `transactionID` is isolated), and each
  Local API call mutates `req.locale`/`req.fallbackLocale` on it. Because Payload re-reads
  `req.locale` lazily while merging incoming values into the per-locale rows, one job's read
  could decide the locale another job's update filed its translations under — observed as the
  English document ending up with Spanish titles and slugs after a bulk translation run.
  Every `findEntityWithConfig`/`updateEntity` call now isolates `locale` and `fallbackLocale`
  on its own req proxy (`isolateObjectProperty`), so concurrent workflows stop sharing that
  mutable state.
- The translate modal no longer renders its resolver buttons when the admin is editing the
  default locale, and `translateOperation` now refuses `locale === defaultLocale` with a 400.
  The default locale is the source every other locale is translated from; translating into
  it replaced the source of truth with machine back-translations.
