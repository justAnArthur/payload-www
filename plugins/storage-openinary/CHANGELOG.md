# Changelog

All notable changes to `@justanarthur/payload-storage-openinary` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- `openinaryStorage({ collections, url, apiKey, folder, publicUrl })`: a Payload storage adapter
  for self-hosted Openinary, built on `@payloadcms/plugin-cloud-storage`. It uploads with
  `POST /upload`, deletes with `DELETE /storage/*`, serves originals through Payload by proxying
  `GET /download/*`, and generates public `/t/*` URLs. Reads `OPENINARY_URL` and
  `OPENINARY_API_KEY` by default.
- Replacing a file keeps its path. Openinary renames on a clash, so the adapter deletes the old file
  first and fails if the server still renames it.
- `createOpenInaryClient` and `createOpenInaryAdapter` for hosts that wire the adapter themselves.
