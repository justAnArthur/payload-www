// @ts-nocheck
import type { TextareaField } from 'payload'

type FieldFunctionProps = {
  /**
   * Tell the component if the generate AI function is available as configured in the plugin config
   */
  hasGenerateAi?: boolean
  /**
   * Tell the component if the generate function is available as configured in the plugin config
   */
  hasGenerateFn?: boolean
  overrides?: Omit<Partial<TextareaField>, 'admin'>
}

type FieldFunction = ({
  hasGenerateAi,
  hasGenerateFn,
  overrides,
}: FieldFunctionProps) => TextareaField

export const MetaDescriptionField: FieldFunction = ({
  hasGenerateAi = false,
  hasGenerateFn = false,
  overrides,
}) => {
  return {
    admin: {
      components: {
        Field: {
          clientProps: {
            hasGenerateDescriptionAi: hasGenerateAi,
            hasGenerateDescriptionFn: hasGenerateFn,
          },
          path: '@payload-starter/seo/fields-components#MetaDescriptionComponent',
        },
      },
    },
    localized: true,
    name: 'description',
    type: 'textarea',
    ...((overrides as TextareaField) ?? {}),
  }
}
