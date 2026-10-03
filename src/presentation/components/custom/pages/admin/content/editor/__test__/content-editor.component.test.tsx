import { act, cleanup, screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ContentEditor } from "~/src/presentation/components/custom/pages/admin/content/editor/content-editor"

const renderEditor = async (invalid = false) => {
  const onChange = vi.fn<(markdown: string) => void>()
  const fieldRef = vi.fn<(target: { focus: () => void }) => void>()
  renderWithProviders(
    <ContentEditor
      fieldRef={fieldRef}
      invalid={invalid}
      label="Page content"
      markdown={"## Returns\n\nYou have **14 days**.\n\n* keep the receipt"}
      onChange={onChange}
    />,
  )
  const textbox = await screen.findByRole("textbox", { name: "Page content" })

  return { fieldRef, onChange, textbox, toolbar: screen.getByRole("toolbar") }
}

beforeAll(() => {
  Object.defineProperty(Range.prototype, "getBoundingClientRect", { configurable: true, value: () => new DOMRect() })
})

afterAll(() => {
  Reflect.deleteProperty(Range.prototype, "getBoundingClientRect")
})

afterEach(cleanup)

describe("ContentEditor", () => {
  it("shows the stored Markdown as formatted text under the field's own label", async () => {
    const { textbox } = await renderEditor()

    expect(within(textbox).getByRole("heading", { level: 2, name: "Returns" })).toBeInTheDocument()
    expect(within(textbox).getByText("14 days").closest("strong")).not.toBeNull()
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

  it("does not report a change just because the stored Markdown was normalised on load", async () => {
    const { onChange } = await renderEditor()

    expect(onChange).not.toHaveBeenCalled()
  })

  it("lets the form focus the editor when its content is invalid", async () => {
    const { fieldRef } = await renderEditor(true)

    expect(typeof fieldRef.mock.lastCall?.[0].focus).toBe("function")
  })

  it("places the caret at the end of the content when the form focuses the field", async () => {
    const { fieldRef, textbox } = await renderEditor(true)

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
