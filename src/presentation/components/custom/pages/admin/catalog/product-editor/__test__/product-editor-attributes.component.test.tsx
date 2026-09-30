import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { FormProvider, useForm } from "react-hook-form"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductFormValues } from "~/src/modules/product/product.zod"

import { ProductEditorAttributes } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-attributes"
import { createEmptyProductFormValues } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form.utils"

const { listPanel } = vi.hoisted(() => ({ listPanel: vi.fn() }))

vi.mock("~/src/modules/product-attribute/use-cases/get-admin-product-attributes", () => ({
  getAdminProductAttributesQuery: () => ({
    queryFn: () => Promise.resolve([{ handle: "material", id: "attr-1" }]),
    queryKey: ["admin", "product-attributes"],
  }),
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-attribute-list-panel", () => ({
  ProductEditorAttributeListPanel: (props: { readonly attributes: unknown; readonly baseName: string }): JSX.Element => {
    listPanel(props)

    return <output data-testid="attribute-panel" />
  },
}))

afterEach(cleanup)

const AttributesHarness = ({
  hasVariants,
}: Readonly<{
  hasVariants: boolean
}>): JSX.Element => {
  const form = useForm<ProductFormValues>({
    defaultValues: {
      ...createEmptyProductFormValues(),
      hasVariants,
    },
  })

  return (
    <FormProvider {...form}>
      <ProductEditorAttributes />
    </FormProvider>
  )
}

describe("ProductEditorAttributes", () => {
  it("titles the section", async () => {
    renderWithProviders(<AttributesHarness hasVariants={false} />)

    expect(await screen.findByText("Attributes")).toBeInTheDocument()
  })

  it("explains product level attributes for a simple product", async () => {
    renderWithProviders(<AttributesHarness hasVariants={false} />)

    expect(
      await screen.findByText("Pick attributes from your catalog (e.g. weight, colour) and set values for this product only."),
    ).toBeInTheDocument()
  })

  it("points at the variants section once the product has variants", async () => {
    renderWithProviders(<AttributesHarness hasVariants />)

    expect(
      await screen.findByText(
        "Shared attributes for the whole product (e.g. material). Per-variant values — e.g. weight — belong in the Variants section on each row.",
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText("Pick attributes from your catalog (e.g. weight, colour) and set values for this product only."),
    ).not.toBeInTheDocument()
  })

  it("hands the fetched catalog attributes to the product level panel", async () => {
    renderWithProviders(<AttributesHarness hasVariants={false} />)
    await screen.findByTestId("attribute-panel")

    expect(listPanel).toHaveBeenCalledWith(
      expect.objectContaining({ attributes: [{ handle: "material", id: "attr-1" }], baseName: "attributeValues" }),
    )
  })
})
