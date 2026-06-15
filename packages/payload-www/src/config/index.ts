// config/ barrel — re-exports the lib's composer API.
// The headline export is `createWWWConfig` (a factory that wires the
// lib's collections, hooks, and render modules around a host's i18n,
// blocks, and SEO fields).
export { createWWWConfig, type WWWConfigOptions, type WWWConfigApi, type WWWInputConfig } from './createWWWConfig'
