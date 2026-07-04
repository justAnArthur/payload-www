





import { createAutoTranslateCollectionHook } from '../jobs/createAutoTranslateCollectionHook'
import { createAutoTranslateGlobalHook } from '../jobs/createAutoTranslateGlobalHook'
import { createTranslateTask } from '../jobs/createTranslateTask'
import { createTranslateWorkflow } from '../jobs/createTranslateWorkflow'
import { TRANSLATE_TASK_SLUG, TRANSLATE_WORKFLOW_SLUG } from '../jobs/constants'

import type { CreateAutoTranslateCollectionHookOptions } from '../jobs/createAutoTranslateCollectionHook'
import type { CreateAutoTranslateGlobalHookOptions } from '../jobs/createAutoTranslateGlobalHook'
import type { CreateTranslateTaskOptions, TranslateTaskConfig } from '../jobs/createTranslateTask'
import type { CreateTranslateWorkflowOptions, TranslateWorkflowConfig } from '../jobs/createTranslateWorkflow'





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
