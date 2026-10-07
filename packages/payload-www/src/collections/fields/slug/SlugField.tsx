import { Button, FieldLabel, TextInput, useDocumentInfo, useField, useFormFields, useTranslation } from '@payloadcms/ui'
import type { TextFieldClientProps } from 'payload'
import { type ChangeEvent, useEffect } from 'react'
import { SLUG_LOCK_FIELD, slugFromTitle, typeSlug } from './format'

type SlugFieldProps = TextFieldClientProps & { useAsTitle: string; nested: boolean }

export const SlugField = ({ field, path, readOnly, useAsTitle, nested }: SlugFieldProps) => {
  const { t } = useTranslation()
  const { id } = useDocumentInfo()
  const { value, setValue, showError } = useField<string>({ path })
  const { value: locked, setValue: setLocked, formInitializing } = useField<boolean>({ path: SLUG_LOCK_FIELD })
  const title = useFormFields(([fields]) => fields[useAsTitle]?.value)

  // a new doc follows its title from the start; an unset lock elsewhere is settled on save
  useEffect(() => {
    if (!id && !formInitializing) setLocked(true, true)
  }, [id, formInitializing, setLocked])

  // a nested page keeps its parent unless the title spells the path
  useEffect(() => {
    if (!locked || typeof title !== 'string') return

    const slug = slugFromTitle(title, nested, value)
    if (slug && slug !== value) setValue(slug)
  }, [locked, title, nested, value, setValue])

  return (
    <div className="field-type slug-field-component">
      <div className="label-wrapper">
        <FieldLabel htmlFor={`field-${path}`} label={field.label} localized={field.localized} required={field.required} />
        {!readOnly && (
          <Button buttonStyle="none" className="lock-button" onClick={() => setLocked(!locked)}>
            {locked ? t('general:unlock') : t('general:lock')}
          </Button>
        )}
      </div>

      <TextInput
        path={path}
        value={value ?? ''}
        onChange={(event: ChangeEvent<HTMLInputElement>) => setValue(typeSlug(event.target.value, nested))}
        readOnly={readOnly || Boolean(locked)}
        showError={showError}
        description={field.admin?.description}
      />
    </div>
  )
}
