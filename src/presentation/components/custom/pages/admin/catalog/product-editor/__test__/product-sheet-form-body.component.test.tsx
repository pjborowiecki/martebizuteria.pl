import { type JSX, type ReactNode } from "react"

import { cleanup, screen } from "@testing-library/react"
import { FormProvider, useForm } from "react-hook-form"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductFormValues } from "~/src/modules/product/product.zod"

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-attributes", () => ({
  ProductEditorAttributes: () => <p>attributes</p>,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-basic", () => ({
  ProductEditorBasic: () => <p>basic</p>,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-media", () => ({
  ProductEditorMedia: () => <p>media</p>,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-organization", () => ({
  ProductEditorOrganization: () => <p>organization</p>,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-pricing", () => ({
  ProductEditorPricing: () => <p>pricing</p>,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-status", () => ({
  ProductEditorStatus: () => <p>status</p>,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-tags", () => ({
  ProductEditorTags: () => <p>tags</p>,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-variant-mode", () => ({
  ProductEditorVariantMode: () => <p>variant mode</p>,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-variants-section", () => ({
  ProductEditorVariantsSection: () => <p>variants</p>,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form-locale-layout", () => ({
  ProductFormLocaleLayout: ({ children }: Readonly<{ children: ReactNode }>) => (
    <section>
      <p>locale layout</p>
      {children}
    </section>
  ),
}))

const { ProductSheetFormBody } =
  await import("~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-sheet-form-body")

const FormHarness = ({ hasVariants }: Readonly<{ hasVariants: boolean }>): JSX.Element => {
  const form = useForm<ProductFormValues>({ defaultValues: { hasVariants } })

  return (
    <FormProvider {...form}>
      <ProductSheetFormBody />
    </FormProvider>
  )
}

const renderBody = (hasVariants: boolean) => renderWithProviders(<FormHarness hasVariants={hasVariants} />)

afterEach(() => {
  cleanup()
})

describe("ProductSheetFormBody", () => {
  it("lays the editor out inside the localized layout", () => {
    renderBody(false)

    expect(screen.getByText("locale layout")).toBeInTheDocument()
  })

  it("shows the sections every product needs", () => {
    renderBody(false)

    expect(screen.getByText("basic")).toBeInTheDocument()
    expect(screen.getByText("status")).toBeInTheDocument()
    expect(screen.getByText("organization")).toBeInTheDocument()
    expect(screen.getByText("variant mode")).toBeInTheDocument()
    expect(screen.getByText("pricing")).toBeInTheDocument()
    expect(screen.getByText("media")).toBeInTheDocument()
    expect(screen.getByText("tags")).toBeInTheDocument()
  })

  it("edits the attributes of a product that has no variants", () => {
    renderBody(false)

    expect(screen.getByText("attributes")).toBeInTheDocument()
    expect(screen.queryByText("variants")).not.toBeInTheDocument()
  })

  it("edits the variants of a product that has them, leaving the product-wide attributes out", () => {
    renderBody(true)

    expect(screen.getByText("variants")).toBeInTheDocument()
    expect(screen.queryByText("attributes")).not.toBeInTheDocument()
  })
})
