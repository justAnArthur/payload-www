// Barrel for the site-wide JSON-LD pipeline: builders + the React component
// that fetches the metadata global and renders the `<script>` tag.
// Host apps import from payload-www (which re-exports this); the seo plugin's
// own subpath export exists for completeness and for tests that don't want
// payload-www's full graph.

import {
  buildOrganizationLd,
  buildProductLd,
  buildRootJsonLd,
  buildWebSiteLd,
  type BuildOrganizationLdOptions,
  type BuildProductLdOptions,
  type BuildRootJsonLdOptions,
  type BuildWebSiteLdOptions
} from '../render/jsonld'

import { RootJsonLd, type RootJsonLdProps } from '../render/RootJsonLd'

const rootJsonLd = {
  RootJsonLd,
  buildOrganizationLd,
  buildWebSiteLd,
  buildProductLd,
  buildRootJsonLd
}

export default rootJsonLd
export {
  RootJsonLd,
  buildOrganizationLd,
  buildWebSiteLd,
  buildProductLd,
  buildRootJsonLd,
  type BuildOrganizationLdOptions,
  type BuildWebSiteLdOptions,
  type BuildProductLdOptions,
  type BuildRootJsonLdOptions,
  type RootJsonLdProps
}