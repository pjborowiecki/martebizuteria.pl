import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, renderHook } from "@testing-library/react"
import { useTranslations } from "use-intl/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { useProductEditorBasicCopy } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/use-product-editor-basic-copy"

afterEach(cleanup)

const Wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <TestProviders queryClient={new QueryClient()} router={createTestRouter()}>
    {children}
  </TestProviders>
)

const renderCopy = () =>
  renderHook(
    () => {
      const t = useTranslations("pages.admin.catalog.products")

      return useProductEditorBasicCopy(t)
    },
    { wrapper: Wrapper },
  )

describe("useProductEditorBasicCopy", () => {
  it("supplies copy for each of the three localized basic fields", () => {
    const { result } = renderCopy()

    expect(Object.keys(result.current).toSorted()).toStrictEqual(["descriptionCopy", "subtitleCopy", "titleCopy"])
  })

  it("resolves the label for the field and locale it is asked for", () => {
    const { result } = renderCopy()

    expect(result.current.titleCopy.label("en-US")).toBe("Product name (EN)")
    expect(result.current.subtitleCopy.label("pl-PL")).toBe("Subtitle (PL)")
  })

  it("resolves the hint from the shared hints namespace", () => {
    const { result } = renderCopy()

    expect(result.current.descriptionCopy.hint("en-US")).toBe("Full description shown on the storefront product page (English).")
  })

  it("resolves the placeholder for the locale it is asked for", () => {
    const { result } = renderCopy()

    expect(result.current.descriptionCopy.placeholder("pl-PL")).toBe("Detailed description of the product...")
  })

  it("keeps the three copies distinct from one another", () => {
    const { result } = renderCopy()

    expect(result.current.titleCopy).not.toBe(result.current.subtitleCopy)
    expect(result.current.titleCopy.label("en-US")).not.toBe(result.current.subtitleCopy.label("en-US"))
  })

  it("returns the same copy objects across re-renders so fields do not remount", () => {
    const { rerender, result } = renderCopy()
    const first = result.current

    rerender()

    expect(result.current).toBe(first)
  })
})
