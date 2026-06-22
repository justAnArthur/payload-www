// Barrel re-exports for `./jobs` subpath. Uses leaf imports (NOT a
// barrel) — see lib-bundling-bunup memory: bunup's DCE drops named
// imports when consumers reach them through a barrel re-export,
// even with splitting:false. Each symbol is imported from its
// source file directly so the binding survives bundling.

import { createAutoTranslateCollectionHook } from '../jobs/createAutoTranslateCollectionHook'
import { createAutoTranslateGlobalHook } from '../jobs/createAutoTranslateGlobalHook'
import { createTranslateTask } from '../jobs/createTranslateTask'
import { createTranslateWorkflow } from '../jobs/createTranslateWorkflow'
import { TRANSLATE_TASK_SLUG, TRANSLATE_WORKFLOW_SLUG } from '../jobs/constants'

import type { CreateAutoTranslateCollectionHookOptions } from '../jobs/createAutoTranslateCollectionHook'
import type { CreateAutoTranslateGlobalHookOptions } from '../jobs/createAutoTranslateGlobalHook'
import type { CreateTranslateTaskOptions, TranslateTaskConfig } from '../jobs/createTranslateTask'
import type { CreateTranslateWorkflowOptions, TranslateWorkflowConfig } from '../jobs/createTranslateWorkflow'

// Force bunup to keep these symbols alive: assign to a const that
// gets re-exported both as named + default exports. Without the
// default export anchor, bunup's DCE drops the factory function
// bodies even with splitting:false.
const jobs: {
  TRANSLATE_TASK_SLUG: string
  TRANSLATE_WORKFLOW_SLUG: string
  createTranslateTask: typeof createTranslateTask
  createTranslateWorkflow: typeof createTranslateWorkflow
  createAutoTranslateCollectionHook: typeof createAutoTranslateCollectionHook
  createAutoTranslateGlobalHook: typeof createAutoTranslateGlobalHook
} = {
  TRANSLATE_TASK_SLUG,
  TRANSLATE_WORKFLOW_SLUG,
  createTranslateTask,
  createTranslateWorkflow,
  createAutoTranslateCollectionHook,
  createAutoTranslateGlobalHook
}

export default jobs

export {
  TRANSLATE_TASK_SLUG,
  TRANSLATE_WORKFLOW_SLUG,
  createTranslateTask,
  createTranslateWorkflow,
  createAutoTranslateCollectionHook,
  createAutoTranslateGlobalHook
}

export type {
  TranslateTaskConfig,
  CreateTranslateTaskOptions,
  TranslateWorkflowConfig,
  CreateTranslateWorkflowOptions,
  CreateAutoTranslateCollectionHookOptions,
  CreateAutoTranslateGlobalHookOptions
}
