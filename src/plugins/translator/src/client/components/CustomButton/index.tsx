import type { CustomPublishButton, CustomSaveButton } from 'payload'

export const CustomButton = (type: 'publish' | 'save'): CustomPublishButton | CustomSaveButton => {
  return {
    clientProps: {
      type,
    },
    path: '@payload-starter/translator/client#CustomButtonWithTranslator',
  }
}
