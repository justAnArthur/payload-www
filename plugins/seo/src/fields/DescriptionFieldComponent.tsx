'use client'

import type { FieldType, Options } from '@payloadcms/ui'
import { FieldLabel, TextareaInput, useField } from '@payloadcms/ui'
import type { TextareaFieldClientProps } from 'payload'
import React from 'react'

import './index.scss'
import { defaults } from '../defaults'
import { LengthIndicator } from '../ui/LengthIndicator'

const { maxLength: maxLengthDefault, minLength: minLengthDefault } = defaults.description

type DescriptionFieldComponentProps = {
  readonly maxLength?: number
  readonly minLength?: number
} & TextareaFieldClientProps

/**
 * Client-only editor UI for the meta `description` field — textarea with a
 * length indicator and a Google "best practices" hint.
 */
export const DescriptionFieldComponent: React.FC<DescriptionFieldComponentProps> = ({
                                                                                      field: {
                                                                                        label,
                                                                                        localized,
                                                                                        required
                                                                                      } = {} as never,
                                                                                      maxLength: maxLengthFromProps,
                                                                                      minLength: minLengthFromProps,
                                                                                      path,
                                                                                      readOnly
                                                                                    }) => {
  const { errorMessage, setValue, showError, value }: FieldType<string> = useField({
    path
  } as Options)
  const minLength = minLengthFromProps ?? minLengthDefault
  const maxLength = maxLengthFromProps ?? maxLengthDefault

  return (
    <div style={{ marginBottom: '20px' }}>
      <div className="plugin-seo__field" style={{ marginBottom: '5px' }}>
        <FieldLabel label={label} localized={localized} path={path} required={required}/>
      </div>
      <div style={{ color: '#9A9A9A', marginBottom: '5px' }}>
        {`This should be between ${minLength} and ${maxLength} characters. For help in writing quality meta descriptions, see `}
        <a
          href="https://developers.google.com/search/docs/advanced/appearance/snippet#meta-descriptions"
          rel="noopener noreferrer"
          target="_blank"
        >
          best practices
        </a>
        .
      </div>
      <TextareaInput
        Error={errorMessage}
        onChange={setValue}
        path={path}
        readOnly={readOnly}
        required={required}
        showError={showError}
        style={{ marginBottom: 0 }}
        value={value}
      />
      <div style={{ alignItems: 'center', display: 'flex', width: '100%' }}>
        <LengthIndicator maxLength={maxLength} minLength={minLength} text={value}/>
      </div>
    </div>
  )
}
