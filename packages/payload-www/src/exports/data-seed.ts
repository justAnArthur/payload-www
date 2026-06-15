import type {
  CreateBaseSeedOptions,
  CreateBaseSeedResult,
  SeedCategoryInput,
  SeedPageInput,
  SeedPostInput,
  SeedUserInput
} from '../data/seed/createBaseSeed'
import { createBaseSeed } from '../data/seed/createBaseSeed'

export default createBaseSeed

export {
  createBaseSeed,
  type CreateBaseSeedOptions,
  type CreateBaseSeedResult,
  type SeedPageInput,
  type SeedPostInput,
  type SeedUserInput,
  type SeedCategoryInput
} from '../data/seed/createBaseSeed'
