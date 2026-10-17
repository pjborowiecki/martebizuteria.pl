import { createRef } from "react"

import { MDXEditor, type MDXEditorMethods, createRootEditorSubscription$, realmPlugin } from "@mdxeditor/editor"
import { cleanup, waitFor } from "@testing-library/react"
import { $getRoot, $isTextNode, type LexicalEditor, PASTE_COMMAND } from "lexical"
import { DatabaseSync } from "node:sqlite"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"
import { MIGRATION, applyMigration } from "~/src/platform/testing/mocks/migrations"

import { CONTENT_EDITOR_MARKDOWN_OPTIONS, CONTENT_EDITOR_PLUGINS } from "~/src/integrations/mdxeditor/mdxeditor.plugins"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { sellerDetailDirectivesPlugin } from "~/src/presentation/components/custom/pages/admin/content/editor/seller-detail-directive"

class DataTransferStub {
  readonly files: File[] = []

  readonly types: string[] = []

  private readonly entries = new Map<string, string>()

  getData(format: string): string {
    return this.entries.get(format === "text" ? "text/plain" : format) ?? ""
  }

  setData(format: string, value: string): void {
    this.entries.set(format, value)
    this.types.push(format)
  }
}

vi.stubGlobal("ClipboardEvent", Event)
vi.stubGlobal("DataTransfer", DataTransferStub)
vi.stubGlobal("DragEvent", MouseEvent)

const seededBodies = (): { readonly body: string; readonly label: string }[] => {
  const sqlite = new DatabaseSync(":memory:")
  applyMigration(sqlite, MIGRATION.CONTENT_PAGES)
  applyMigration(sqlite, MIGRATION.TERMS_OF_SERVICE_PAGE)
  applyMigration(sqlite, MIGRATION.RETURNS_AND_COMPLAINTS_PAGE)
  applyMigration(sqlite, MIGRATION.PRIVACY_POLICY_PAGE)
  applyMigration(sqlite, MIGRATION.WITHDRAWAL_FUNCTION_LINKS)
  applyMigration(sqlite, MIGRATION.FAQ_PAGE)
  applyMigration(sqlite, MIGRATION.SELLER_PLACEHOLDERS)
  applyMigration(sqlite, MIGRATION.PRIVACY_POLICY_EVERY_COOKIE)
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

const mountEditor = (markdown: string): Promise<{ readonly lexical: LexicalEditor; readonly methods: MDXEditorMethods }> => {
  const editor = createRef<MDXEditorMethods>()
  const root: { current: LexicalEditor | undefined } = { current: undefined }
  const captureRootEditor = realmPlugin({
    init(realm) {
      realm.pub(createRootEditorSubscription$, (lexical: LexicalEditor) => {
        root.current = lexical

        return () => {}
      })
    },
  })
  renderWithProviders(
    <MDXEditor
      markdown={markdown}
      plugins={[...CONTENT_EDITOR_PLUGINS, sellerDetailDirectivesPlugin, captureRootEditor()]}
      ref={editor}
      toMarkdownOptions={CONTENT_EDITOR_MARKDOWN_OPTIONS}
    />,
  )

  return waitFor(() => {
    if (editor.current === null || root.current === undefined) {
      throw new Error("the editor has not mounted yet")
    }

    return { lexical: root.current, methods: editor.current }
  })
}

const savedMarkdown = async (markdown: string): Promise<string> => {
  const { methods } = await mountEditor(markdown)

  return methods.getMarkdown().trim()
}

const pasteEvent = (text: string): ClipboardEvent => {
  const clipboardData = new DataTransfer()
  clipboardData.setData("text/plain", text)

  return Object.assign(new ClipboardEvent("paste"), { clipboardData })
}

const pasteOverWord = async (markdown: string, word: string, pasted: string): Promise<MDXEditorMethods> => {
  const { lexical, methods } = await mountEditor(markdown)
  lexical.update(
    () => {
      const text = $getRoot().getFirstDescendant()
      if ($isTextNode(text)) {
        const start = text.getTextContent().indexOf(word)
        text.select(start, start + word.length)
      }
    },
    { discrete: true },
  )
  lexical.dispatchCommand(PASTE_COMMAND, pasteEvent(pasted))

  return methods
}

afterEach(cleanup)

describe("the content editor's Markdown", () => {
  it.each(seededBodies())(
    "round-trips the $label page byte for byte, postal-address breaks and store details included",
    async ({ body }) => {
      await expect(savedMarkdown(body)).resolves.toBe(body)
    },
  )

  it.each([
    ["a line break written as a backslash", "Pyciak Mariusz Firma Jubilerska\\\nul. Wąska 11"],
    ["literal text that would otherwise start a list", String.raw`1\. not a list`],
    ["literal text that would otherwise start a bullet", String.raw`\- not a bullet`],
    ["emphasis next to punctuation", "Article &#x36;*(1)* GDPR"],
    ["bold before a letter", "**Ważne!**&#x5A;wrotom"],
    ["a heading ending in a hash", String.raw`## Ring \#`],
    ["links to pages and files", "[FAQ](/faq) or [form](/forms/formularz_zwrotu.pdf)"],
    ["store details, an unknown one included", "NIP :seller[nip], :seller[emailLink] and :seller[iban]"],
    ["text that merely mentions a colon and brackets", String.raw`Time 10:30 \[draft]`],
  ])("keeps %s exactly as written", async (_case, markdown) => {
    await expect(savedMarkdown(markdown)).resolves.toBe(markdown)
  })

  it("writes bullets with a dash, the way the pages were written", async () => {
    await expect(savedMarkdown("* one\n* two")).resolves.toBe("- one\n- two")
  })

  it("escapes a typed colon before a word, so it never turns into a store detail", async () => {
    await expect(savedMarkdown("Ref:ABC")).resolves.toBe(String.raw`Ref\:ABC`)
  })

  it("escapes the colon of an e-mail link the way the content page check and the storefront read it back", async () => {
    await expect(savedMarkdown("[Napisz](mailto:kontakt@martebizuteria.pl)")).resolves.toBe(
      String.raw`[Napisz](mailto\:kontakt@martebizuteria.pl)`,
    )
  })

  it("saves two line breaks in a row as a paragraph break instead of stacked backslashes", async () => {
    await expect(savedMarkdown("Kontakt\\\n\\\nul. Wąska 11")).resolves.toBe("Kontakt\n\nul. Wąska 11")
  })
})

describe("pasting a link over selected text", () => {
  it("links the selection to a store page", async () => {
    const methods = await pasteOverWord("Read the FAQ", "FAQ", "/faq")

    await waitFor(() => {
      expect(methods.getMarkdown().trim()).toBe("Read the [FAQ](/faq)")
    })
  })

  it("pastes an off-site protocol-relative address as plain text instead of linking to it", async () => {
    const methods = await pasteOverWord("Read the FAQ", "FAQ", "//evil.example/faq")

    await waitFor(() => {
      expect(methods.getMarkdown().trim()).toBe("Read the //evil.example/faq")
    })
  })
})
