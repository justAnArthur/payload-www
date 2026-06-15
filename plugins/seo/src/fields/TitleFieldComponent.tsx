'use client'

import type { FieldType, Options } from '@payloadcms/ui'
import { FieldLabel, TextInput, useField } from '@payloadcms/ui'
import type { TextFieldClientProps } from 'payload'
import React from 'react'

import './index.scss'
import { defaults } from '../defaults'
import { LengthIndicator } from '../ui/LengthIndicator'

const { maxLength: maxLengthDefault, minLength: minLengthDefault } = defaults.title

type TitleFieldComponentProps = {
  readonly maxLength?: number
  readonly minLength?: number
} & TextFieldClientProps

/**
 * Client-only editor UI for the meta `title` field — text input with a
 * length indicator and a Google "best practices" hint.
 */
export const TitleFieldComponent: React.FC<TitleFieldComponentProps> = ({
                                                                          field: { label, required } = {} as never,
                                                                          maxLength: maxLengthFromProps,
                                                                          minLength: minLengthFromProps,
                                                                          path,
                                                                          readOnly
                                                                        }) => {
  const field: FieldType<string> = useField({ path } as Options)
  const { errorMessage, setValue, showError, value } = field
  const minLength = minLengthFromProps ?? minLengthDefault
  const maxLength = maxLengthFromProps ?? maxLengthDefault

  return (
    <div style={{ marginBottom: '20px' }}>
      <div className="plugin-seo__field" style={{ marginBottom: '5px' }}>
        <FieldLabel label={label} path={path} required={required}/>
      </div>
      <div style={{ color: '#9A9A9A', marginBottom: '5px' }}>
        {`This should be between ${minLength} and ${maxLength} characters. For help in writing quality meta titles, see `}
        <a
          href="https://developers.google.com/search/docs/advanced/appearance/title-link#page-titles"
          rel="noopener noreferrer"
          target="_blank"
        >
          best practices
        </a>
        .
      </div>
      <TextInput
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
