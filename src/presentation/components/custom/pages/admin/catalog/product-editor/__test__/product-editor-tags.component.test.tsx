import { type JSX, useEffect } from "react"

import { cleanup, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FormProvider, type UseFormReturn, useForm } from "react-hook-form"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { PRODUCT_COLUMN_LENGTH } from "~/src/modules/product/product.constants"
import { type ProductFormValues } from "~/src/modules/product/product.zod"

import { CatalogLocalePickerProvider } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-locale-picker"
import { ProductEditorTags } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-tags"
import { createEmptyProductFormValues } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form.utils"

afterEach(cleanup)

type ProductForm = UseFormReturn<ProductFormValues>

const TagsHarness = ({
  fillHeight = false,
  locale,
  onForm,
  tags,
}: Readonly<{
  fillHeight?: boolean
  locale: SupportedLocale
  onForm: (form: ProductForm) => void
  tags: ProductFormValues["tags"]
}>): JSX.Element => {
  const form = useForm<ProductFormValues>({
    defaultValues: {
      ...createEmptyProductFormValues(),
      tags,
    },
  })
  useEffect(() => {
    onForm(form)
  }, [form, onForm])

  return (
    <CatalogLocalePickerProvider activeLocale={locale}>
      <FormProvider {...form}>
        <ProductEditorTags fillHeight={fillHeight} />
      </FormProvider>
    </CatalogLocalePickerProvider>
  )
}

const renderTags = (tags: ProductFormValues["tags"], locale: SupportedLocale = "en-US"): (() => ProductFormValues["tags"]) => {
  const captured: ProductForm[] = []
  const onForm = (form: ProductForm): void => {
    captured.push(form)
  }
  renderWithProviders(<TagsHarness locale={locale} onForm={onForm} tags={tags} />)

  return () => {
    const [form] = captured
    if (form === undefined) {
      throw new TypeError("the harness never exposed its form")
    }

    return form.getValues("tags")
  }
}

const emptyTags = (): ProductFormValues["tags"] => ({ "en-US": [], "pl-PL": [] })

describe("ProductEditorTags", () => {
  it("expands both the card and its content when embedded in a full-height editor column", () => {
    renderWithProviders(<TagsHarness fillHeight locale="en-US" onForm={() => {}} tags={emptyTags()} />)

    expect(screen.getByText("Tags").closest('[data-slot="card"]')).toHaveClass("h-full", "flex-col")
    expect(screen.getByRole("textbox").closest('[data-slot="card-content"]')).toHaveClass("flex-1", "min-h-0")
  })

  it("titles the card and prompts for a tag", () => {
    renderTags(emptyTags())

    expect(screen.getByText("Tags")).toBeInTheDocument()
    expect(screen.getByRole("textbox")).toHaveAttribute("placeholder", "Add a tag...")
    expect(screen.getByRole("button", { name: "Add tag" })).toBeInTheDocument()
  })

  it("caps the tag length at the stored column width", () => {
    renderTags(emptyTags())

    expect(screen.getByRole("textbox")).toHaveAttribute("maxlength", String(PRODUCT_COLUMN_LENGTH.tag))
  })

  it("shows only the tags of the active locale", () => {
    renderTags({ "en-US": ["gift"], "pl-PL": ["prezent"] })

    expect(screen.getByText("gift")).toBeInTheDocument()
    expect(screen.queryByText("prezent")).not.toBeInTheDocument()
  })

  it("shows the other locale's tags once it becomes active", () => {
    renderTags({ "en-US": ["gift"], "pl-PL": ["prezent"] }, "pl-PL")

    expect(screen.getByText("prezent")).toBeInTheDocument()
    expect(screen.queryByText("gift")).not.toBeInTheDocument()
  })

  it("adds a lowercased, trimmed tag to the active locale only", async () => {
    const tags = renderTags(emptyTags())

    await userEvent.type(screen.getByRole("textbox"), "  Gift Idea  ")
    await userEvent.click(screen.getByRole("button", { name: "Add tag" }))

    expect(tags()).toStrictEqual({ "en-US": ["gift idea"], "pl-PL": [] })
    expect(screen.getByText("gift idea")).toBeInTheDocument()
  })

  it("clears the input after a tag is added", async () => {
    renderTags(emptyTags())

    await userEvent.type(screen.getByRole("textbox"), "gift")
    await userEvent.click(screen.getByRole("button", { name: "Add tag" }))

    expect(screen.getByRole("textbox")).toHaveValue("")
  })

  it("adds a tag when Enter is pressed instead of clicking", async () => {
    const tags = renderTags(emptyTags())

    await userEvent.type(screen.getByRole("textbox"), "gift{Enter}")

    expect(tags()["en-US"]).toStrictEqual(["gift"])
  })

  it("ignores a blank tag", async () => {
    const tags = renderTags(emptyTags())

    await userEvent.type(screen.getByRole("textbox"), "   ")
    await userEvent.click(screen.getByRole("button", { name: "Add tag" }))

    expect(tags()["en-US"]).toStrictEqual([])
  })

  it("refuses a duplicate and keeps the typed value so it can be corrected", async () => {
    const tags = renderTags({ "en-US": ["gift"], "pl-PL": [] })

    await userEvent.type(screen.getByRole("textbox"), "GIFT")
    await userEvent.click(screen.getByRole("button", { name: "Add tag" }))

    expect(tags()["en-US"]).toStrictEqual(["gift"])
    expect(screen.getByRole("textbox")).toHaveValue("GIFT")
  })

  it("appends a new tag after the existing ones", async () => {
    const tags = renderTags({ "en-US": ["gift"], "pl-PL": [] })

    await userEvent.type(screen.getByRole("textbox"), "sale")
    await userEvent.click(screen.getByRole("button", { name: "Add tag" }))

    expect(tags()["en-US"]).toStrictEqual(["gift", "sale"])
  })

  it("removes only the tag whose chip was dismissed", async () => {
    const tags = renderTags({ "en-US": ["gift", "sale"], "pl-PL": ["prezent"] })

    await userEvent.click(within(screen.getByText("gift")).getByRole("button"))

    expect(tags()).toStrictEqual({ "en-US": ["sale"], "pl-PL": ["prezent"] })
    expect(screen.queryByText("gift")).not.toBeInTheDocument()
    expect(screen.getByText("sale")).toBeInTheDocument()
  })

  it("drops the chip row once the last tag of the locale is removed", async () => {
    const tags = renderTags({ "en-US": ["gift"], "pl-PL": ["prezent"] })

    await userEvent.click(within(screen.getByText("gift")).getByRole("button"))

    expect(tags()["en-US"]).toStrictEqual([])
    expect(screen.queryByText("gift")).not.toBeInTheDocument()
    expect(screen.getByRole("textbox")).toBeInTheDocument()
  })
})
