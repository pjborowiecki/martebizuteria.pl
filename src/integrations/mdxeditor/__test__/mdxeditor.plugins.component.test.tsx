import { createRef } from "react"

import { MDXEditor, type MDXEditorMethods } from "@mdxeditor/editor"
import { cleanup, render, waitFor } from "@testing-library/react"
import { DatabaseSync } from "node:sqlite"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { MIGRATION, applyMigration } from "~/src/platform/testing/mocks/migrations"

import { CONTENT_EDITOR_MARKDOWN_OPTIONS, CONTENT_EDITOR_PLUGINS } from "~/src/integrations/mdxeditor/mdxeditor.plugins"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

const seededBodies = (): { readonly body: string; readonly label: string }[] => {
  const sqlite = new DatabaseSync(":memory:")
  applyMigration(sqlite, MIGRATION.CONTENT_PAGES)
  const rows = sqlite
    .prepare("select handle, json_extract(bodies, '$.\"pl-PL\"') as pl, json_extract(bodies, '$.\"en-US\"') as en from content_page")
    .all()
  sqlite.close()

  return rows.flatMap((row) =>
    I18N.SUPPORTED_LOCALES.map((locale) => ({
      body: String(locale === "pl-PL" ? row["pl"] : row["en"]),
      label: `${String(row["handle"])} ${locale}`,
    })),
  )
}

const savedMarkdown = async (markdown: string): Promise<string> => {
  const editor = createRef<MDXEditorMethods>()
  render(
    <MDXEditor markdown={markdown} plugins={CONTENT_EDITOR_PLUGINS} ref={editor} toMarkdownOptions={CONTENT_EDITOR_MARKDOWN_OPTIONS} />,
  )
  const methods = await waitFor(() => {
    if (editor.current === null) {
      throw new Error("the editor has not mounted yet")
    }

    return editor.current
  })

  return methods.getMarkdown().trim()
}

afterEach(cleanup)

describe("the content editor's Markdown", () => {
  it.each(seededBodies())("round-trips the $label page byte for byte, postal-address breaks included", async ({ body }) => {
    await expect(savedMarkdown(body)).resolves.toBe(body)
  })

  it.each([
    ["a line break written as a backslash", "Pyciak Mariusz Firma Jubilerska\\\nul. Wąska 11"],
    ["literal text that would otherwise start a list", String.raw`1\. not a list`],
    ["literal text that would otherwise start a bullet", String.raw`\- not a bullet`],
    ["emphasis next to punctuation", "Article &#x36;*(1)* GDPR"],
    ["bold before a letter", "**Ważne!**&#x5A;wrotom"],
    ["a heading ending in a hash", String.raw`## Ring \#`],
    ["links to mail, pages and files", "[Napisz](mailto:kontakt@martebizuteria.pl), [FAQ](/faq) or [form](/forms/formularz_zwrotu.pdf)"],
  ])("keeps %s exactly as written", async (_case, markdown) => {
    await expect(savedMarkdown(markdown)).resolves.toBe(markdown)
  })

  it("writes bullets with a dash, the way the pages were written", async () => {
    await expect(savedMarkdown("* one\n* two")).resolves.toBe("- one\n- two")
  })
})
