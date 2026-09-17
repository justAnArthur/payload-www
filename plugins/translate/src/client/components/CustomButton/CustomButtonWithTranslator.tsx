'use client'

import './styles.css'

import { PublishButton, SaveButton, useConfig, useDocumentInfo, useLocale } from '@payloadcms/ui'

import type { TranslateResolver } from '../../../resolvers/types'
import { TranslatorProvider } from '../../providers/Translator/TranslatorProvider'
import { ResolverButton } from '../ResolverButton'
import { TranslatorModal } from '../TranslatorModal'

export const CustomButtonWithTranslator = ({ type }: { type: 'publish' | 'save' }) => {
  const { config } = useConfig()

  const DefaultButton = type === 'publish' ? PublishButton : SaveButton

  const { globalSlug, id } = useDocumentInfo()

  const locale = useLocale()

  const resolvers = (config.admin?.custom?.translator?.resolvers as TranslateResolver[]) ?? []

  if (!id && !globalSlug) return <DefaultButton/>

  // the default locale is the translation source — never offer to translate into it
  const { localization } = config

  if (localization && locale.code === localization.defaultLocale) return <DefaultButton/>

  return (
    <TranslatorProvider>
      <div className={'translator__custom-save-button'}>
        <TranslatorModal/>
        {resolvers.map((resolver) => (
          <ResolverButton key={resolver.key} resolver={resolver}/>
        ))}
        {<DefaultButton/>}
      </div>
    </TranslatorProvider>
  )
}
