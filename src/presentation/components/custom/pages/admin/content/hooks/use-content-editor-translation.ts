import { useCallback } from "react"

import { type Translation } from "@mdxeditor/editor"
import { useTranslations } from "use-intl/react"

const EDITABLE_AREA_KEY = "contentArea.editableMarkdown"

const asMessageValues = (interpolations: Record<string, unknown>): Record<string, string> =>
  Object.fromEntries(Object.entries(interpolations).map(([name, value]) => [name, String(value)]))

export const useContentEditorTranslation = (editableAreaLabel: string): Translation => {
  const t = useTranslations("pages.admin.content.editor.mdx")

  return useCallback<Translation>(
    (key, defaultValue, interpolations) => {
      if (key === EDITABLE_AREA_KEY) {
        return editableAreaLabel
      }

      if (!t.has(key)) {
        return defaultValue
      }

      return interpolations === undefined ? t(key) : t(key, asMessageValues(interpolations))
    },
    [editableAreaLabel, t],
  )
}
