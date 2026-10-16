import { act, cleanup, screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ContentEditor } from "~/src/presentation/components/custom/pages/admin/content/editor/content-editor"

const RETURNS_MARKDOWN = "## Returns\n\nYou have **14 days**.\n\n* keep the receipt"

const renderEditor = async ({
  invalid = false,
  markdown = RETURNS_MARKDOWN,
  withSellerDetails = false,
}: Readonly<{ invalid?: boolean; markdown?: string; withSellerDetails?: boolean }> = {}) => {
  const onChange = vi.fn<(markdown: string) => void>()
  const fieldRef = vi.fn<(target: { focus: () => void }) => void>()
  renderWithProviders(
    <ContentEditor
      fieldRef={fieldRef}
      invalid={invalid}
      label="Page content"
      markdown={markdown}
      onChange={onChange}
      withSellerDetails={withSellerDetails}
    />,
  )
  const textbox = await screen.findByRole("textbox", { name: "Page content" })

  return { fieldRef, onChange, textbox, toolbar: screen.getByRole("toolbar") }
}

beforeAll(() => {
  Object.defineProperty(Range.prototype, "getBoundingClientRect", { configurable: true, value: () => new DOMRect() })
  Object.defineProperty(Element.prototype, "hasPointerCapture", { configurable: true, value: () => false })
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: () => {} })
})

afterAll(() => {
  Reflect.deleteProperty(Range.prototype, "getBoundingClientRect")
  Reflect.deleteProperty(Element.prototype, "hasPointerCapture")
  Reflect.deleteProperty(Element.prototype, "scrollIntoView")
})

afterEach(cleanup)

describe("ContentEditor", () => {
  it("shows the stored Markdown as formatted text under the field's own label", async () => {
    const { textbox } = await renderEditor()

    expect(within(textbox).getByRole("heading", { level: 2, name: "Returns" })).toBeInTheDocument()
    expect(within(textbox).getByText("14 days").closest("strong")).not.toBeNull()
  })

  it("gives the text a narrower margin on phones than on wider screens", async () => {
    const { textbox } = await renderEditor()

    expect(textbox).toHaveClass("px-4", "py-5", "sm:px-8", "sm:py-7")
  })

  it("offers only the formatting the storefront can show, in the admin's language", async () => {
    const { toolbar } = await renderEditor()
    const labels = [...toolbar.querySelectorAll("[aria-label]")].map((control) => control.getAttribute("aria-label"))

    expect(labels).toStrictEqual([
      "Undo Ctrl+Z",
      "Redo Ctrl+Y",
      "Text style",
      "Bold",
      "Italic",
      "List type",
      "Bulleted list",
      "Numbered list",
      "Link",
      "Divider",
    ])
  })

  it("adds the store details to the toolbar of a content page", async () => {
    const { toolbar } = await renderEditor({ withSellerDetails: true })

    expect([...toolbar.querySelectorAll("[aria-label]")].map((control) => control.getAttribute("aria-label")).at(-1)).toBe(
      "Insert store detail",
    )
  })

  it("shows each store detail of a content page as a chip named after the detail, and flags an unknown one", async () => {
    const { onChange, textbox } = await renderEditor({
      markdown: "Write to :seller[emailLink], NIP :seller[nip] and :seller[iban].",
      withSellerDetails: true,
    })

    expect([...textbox.querySelectorAll("[contenteditable=false]")].map((chip) => chip.textContent)).toStrictEqual([
      "Email (link)",
      "NIP",
      "Unknown store detail",
    ])
    expect(onChange).not.toHaveBeenCalled()
  })

  it("inserts the store detail the admin picks where the caret is", async () => {
    const { onChange, textbox } = await renderEditor({ markdown: ".", withSellerDetails: true })

    await userEvent.click(textbox)
    await userEvent.keyboard("NIP ")
    await userEvent.click(screen.getByRole("combobox", { name: "Insert store detail" }))
    await userEvent.click(await screen.findByRole("option", { name: "NIP" }))

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith("NIP :seller[nip].")
    })
  })

  it("does not report a change just because the stored Markdown was normalised on load", async () => {
    const { onChange } = await renderEditor()

    expect(onChange).not.toHaveBeenCalled()
  })

  it("lets the form focus the editor when its content is invalid", async () => {
    const { fieldRef } = await renderEditor({ invalid: true })

    expect(typeof fieldRef.mock.lastCall?.[0].focus).toBe("function")
  })

  it("places the caret at the end of the content when the form focuses the field", async () => {
    const { fieldRef, textbox } = await renderEditor({ invalid: true })

    expect(document.getSelection()?.anchorNode).not.toBe(textbox.lastElementChild)

    act(() => {
      fieldRef.mock.lastCall?.[0].focus()
    })

    await waitFor(() => {
      expect(document.getSelection()?.anchorNode).toBe(textbox.lastElementChild)
    })
  })

  it("reports the edited Markdown without the trailing line break", async () => {
    const { onChange, textbox } = await renderEditor()

    await userEvent.click(textbox)
    await userEvent.keyboard("Easy ")

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith("## Easy Returns\n\nYou have **14 days**.\n\n- keep the receipt")
    })
  })
})
