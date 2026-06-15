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

  if (siblingData.text) {
    onText(siblingData)
  }

  if (Array.isArray(siblingData?.children)) {
    for (const child of siblingData.children) {
      traverseRichText({
        onText,
        root,
        siblingData: child,
        additionalTraverseRichText
      })
    }
  } else {
    additionalTraverseRichText?.({ onText, root, siblingData })
  }
}
