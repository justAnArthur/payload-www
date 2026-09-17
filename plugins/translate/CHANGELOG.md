# Changelog

All notable changes to `@justanarthur/payload-plugin-translator` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

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
