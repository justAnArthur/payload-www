# Changelog

All notable changes to `@justanarthur/payload-plugin-seo` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- `createLlmsGlobal()` in `./globals`: an opt-in `llms` global (site name, summary, details,
  per-collection section titles and exclusion, excluded pages, extra markdown) read by
  `@justanarthur/payload-www`'s `/llms.txt` routes. Not registered by default; adding it is a
  schema change that needs a migration.

### Fixed

- `next` is now a peer dependency (`^16.2.6`, the range `@justanarthur/payload-www` uses).
  The `./opengraph-image` route imports `next/og` at runtime, and the plugin reaches
  `next/cache` through `@justanarthur/payload-www/metadata`, but the manifest never
  declared `next`, so it only resolved when the host happened to hoist it.

## [4.1.0] - 2026-09-16

### Changed

- `CreateSiteDefaultsArgs.config` and `RootJsonLdProps.config` widened from
  `Promise<SanitizedConfig>` to `SanitizedConfig | Promise<SanitizedConfig>`. Permissive
  widening — existing callers passing `Promise<SanitizedConfig>` continue to work; callers
  that already hold a resolved `SanitizedConfig` no longer have to wrap it in
  `Promise.resolve(...)`. Matches the union already accepted by `seedPayloadCache`. This
  also unblocks TypeScript's structural comparison in `payload-www`'s
  `createCollectionPageExports` / `createRootLayoutExports`, where the deep recursion of
  Payload's `SanitizedConfig` was tripping TS2321 (`Excessive stack depth comparing types`)
  when both sides of the comparison walked `Promise<SanitizedConfig>`. Compiled JavaScript
  output is unchanged from 4.0.1.
