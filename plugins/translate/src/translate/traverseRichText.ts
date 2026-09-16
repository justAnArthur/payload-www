type TraverseRichTextParams = {
  onText: (siblingData: Record<string, unknown>, attribute?: string) => void
  root: Record<string, unknown>
  siblingData?: Record<string, unknown>
}

export const traverseRichText = ({
                                   onText,
                                   root,
                                   siblingData,

                                   additionalTraverseRichText
                                 }: TraverseRichTextParams & {
  additionalTraverseRichText: ((args: TraverseRichTextParams) => void) | undefined
}) => {
  siblingData = siblingData ?? root

  if (typeof siblingData.text === 'string' && siblingData.text.trim()) {
    onText(siblingData)
  }

  // block and inline block nodes carry their own fields; the host decides what to translate
  if (!('text' in siblingData)) {
    additionalTraverseRichText?.({ onText, root, siblingData })
  }

  if (Array.isArray(siblingData.children)) {
    for (const child of siblingData.children) {
      if (child && typeof child === 'object')
        traverseRichText({
          onText,
          root,
          siblingData: child as Record<string, unknown>,
          additionalTraverseRichText
        })
    }
  }
}
