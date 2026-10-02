import { type JSX, useCallback } from "react"

import { MDXEditor, type MDXEditorMethods, toolbarPlugin } from "@mdxeditor/editor"
import { cn } from "cn"
import { type RefCallBack } from "react-hook-form"

import { CONTENT_EDITOR_MARKDOWN_OPTIONS, CONTENT_EDITOR_PLUGINS } from "~/src/integrations/mdxeditor/mdxeditor.plugins"

import { ContentEditorToolbar } from "~/src/presentation/components/custom/pages/admin/content/editor/content-editor-toolbar"
import { useContentEditorTranslation } from "~/src/presentation/components/custom/pages/admin/content/hooks/use-content-editor-translation"
import { CONTENT_PROSE_CLASS } from "~/src/presentation/components/custom/pages/content-page/content-page.styles"

const EDITABLE_CLASS = cn(CONTENT_PROSE_CLASS, "min-h-96 px-8 py-7")

const PLUGINS = [...CONTENT_EDITOR_PLUGINS, toolbarPlugin({ toolbarContents: () => <ContentEditorToolbar /> })]

export const ContentEditor = ({ fieldRef, invalid, label, markdown, onChange }: Readonly<ContentEditorProps>): JSX.Element => {
  const translation = useContentEditorTranslation(label)
  const registerFocusTarget = useCallback(
    (methods: MDXEditorMethods | null) => {
      if (methods !== null) {
        fieldRef({
          focus: () => {
            methods.focus()
          },
        })
      }
    },
    [fieldRef],
  )

  const reportChange = useCallback(
    (next: string, initialMarkdownNormalize: boolean) => {
      if (!initialMarkdownNormalize) {
        onChange(next.trim())
      }
    },
    [onChange],
  )

  return (
    <MDXEditor
      className={cn("content-editor rounded-lg border border-input bg-background", invalid && "border-destructive")}
      contentEditableClassName={EDITABLE_CLASS}
      markdown={markdown}
      onChange={reportChange}
      plugins={PLUGINS}
      ref={registerFocusTarget}
      toMarkdownOptions={CONTENT_EDITOR_MARKDOWN_OPTIONS}
      translation={translation}
    />
  )
}

interface ContentEditorProps {
  readonly fieldRef: RefCallBack
  readonly invalid: boolean
  readonly label: string
  readonly markdown: string
  readonly onChange: (markdown: string) => void
}
