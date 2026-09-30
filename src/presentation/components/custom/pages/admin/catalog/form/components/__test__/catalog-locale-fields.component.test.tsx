import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { type UseFormReturn, useForm } from "react-hook-form"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type ProductCategory } from "~/src/modules/product-category/product-category.types"
import { type ProductCollection } from "~/src/modules/product-collection/product-collection.types"
import { type Product } from "~/src/modules/product/product.types"

import {
  type CatalogLocaleFieldsCopy,
  CategoryCatalogLocaleFormField,
  CategoryCatalogLocaleTextareaFormField,
  CollectionCatalogLocaleFormField,
  CollectionCatalogLocaleTextareaFormField,
  ProductCatalogLocaleFormField,
  ProductCatalogLocaleTextareaFormField,
} from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-locale-fields"
import { CatalogLocalePickerProvider } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-locale-picker"

const copy: CatalogLocaleFieldsCopy = {
  hint: (locale) => `hint for ${locale}`,
  label: (locale) => `Title (${locale})`,
  placeholder: (locale) => `type the ${locale} title`,
}

const LOCALE_MAP = { "en-US": "Silver rings", "pl-PL": "Srebrne pierscionki" }

const EMPTY_MAP = { "en-US": "", "pl-PL": "" }

const categoryDefaults = (titles: Record<string, string>) => ({
  descriptions: { ...EMPTY_MAP },
  handle: "rings",
  image: "",
  parentId: "",
  shortDescriptions: { ...EMPTY_MAP },
  status: "draft" as const,
  subtitles: { ...EMPTY_MAP },
  titles,
})

const forms: {
  category?: UseFormReturn<ProductCategory["formValues"]>
  collection?: UseFormReturn<ProductCollection["formValues"]>
  product?: UseFormReturn<Product["formValues"]>
} = {}

const CategoryInputHarness = ({
  activeLocale,
  disabled,
  onDefaultLocaleChange,
  required,
  titles,
}: Readonly<{
  activeLocale: SupportedLocale
  disabled: boolean
  onDefaultLocaleChange: ((value: string) => void) | undefined
  required: boolean
  titles: Record<string, string>
}>): JSX.Element => {
  const form = useForm<ProductCategory["formValues"]>({ defaultValues: categoryDefaults(titles) })
  forms.category = form

  return (
    <CatalogLocalePickerProvider activeLocale={activeLocale}>
      <CategoryCatalogLocaleFormField
        control={form.control}
        copy={copy}
        disabled={disabled}
        maxLength={60}
        name="titles"
        required={required}
        translateValidation={(key) => `translated:${key}`}
        validationKeySet={new Set(["category.titleRequired"])}
        {...(onDefaultLocaleChange === undefined ? {} : { onDefaultLocaleChange })}
      />
    </CatalogLocalePickerProvider>
  )
}

const CategoryTextareaHarness = ({ rows }: Readonly<{ rows: number | undefined }>): JSX.Element => {
  const form = useForm<ProductCategory["formValues"]>({ defaultValues: categoryDefaults({ ...EMPTY_MAP }) })
  forms.category = form

  return (
    <CatalogLocalePickerProvider activeLocale="en-US">
      <CategoryCatalogLocaleTextareaFormField
        control={form.control}
        copy={copy}
        maxLength={400}
        name="descriptions"
        {...(rows === undefined ? {} : { rows })}
      />
    </CatalogLocalePickerProvider>
  )
}

const CollectionInputHarness = ({ onDefaultLocaleChange }: Readonly<{ onDefaultLocaleChange: (value: string) => void }>): JSX.Element => {
  const form = useForm<ProductCollection["formValues"]>({
    defaultValues: { descriptions: { ...EMPTY_MAP }, handle: "sale", image: "", status: "draft", titles: { ...LOCALE_MAP } },
  })
  forms.collection = form

  return (
    <CatalogLocalePickerProvider activeLocale="pl-PL">
      <CollectionCatalogLocaleFormField
        control={form.control}
        copy={copy}
        maxLength={80}
        name="titles"
        onDefaultLocaleChange={onDefaultLocaleChange}
        required
      />
    </CatalogLocalePickerProvider>
  )
}

const CollectionTextareaHarness = (): JSX.Element => {
  const form = useForm<ProductCollection["formValues"]>({
    defaultValues: { descriptions: { "en-US": "Handmade", "pl-PL": "" }, handle: "sale", image: "", status: "draft", titles: EMPTY_MAP },
  })
  forms.collection = form

  return (
    <CatalogLocalePickerProvider activeLocale="en-US">
      <CollectionCatalogLocaleTextareaFormField control={form.control} copy={copy} disabled maxLength={500} name="descriptions" rows={9} />
    </CatalogLocalePickerProvider>
  )
}

const ProductInputHarness = ({ activeLocale }: Readonly<{ activeLocale: SupportedLocale }>): JSX.Element => {
  const form = useForm<Product["formValues"]>({
    defaultValues: { descriptions: { ...EMPTY_MAP }, subtitles: { ...EMPTY_MAP }, titles: { ...LOCALE_MAP } },
  })
  forms.product = form

  return (
    <CatalogLocalePickerProvider activeLocale={activeLocale}>
      <ProductCatalogLocaleFormField control={form.control} copy={copy} maxLength={120} name="titles" />
    </CatalogLocalePickerProvider>
  )
}

const ProductTextareaHarness = ({ fillHeight }: Readonly<{ fillHeight: boolean }>): JSX.Element => {
  const form = useForm<Product["formValues"]>({
    defaultValues: { descriptions: { "en-US": "Forged by hand", "pl-PL": "" }, subtitles: { ...EMPTY_MAP }, titles: { ...EMPTY_MAP } },
  })
  forms.product = form

  return (
    <CatalogLocalePickerProvider activeLocale="en-US">
      <ProductCatalogLocaleTextareaFormField
        control={form.control}
        copy={copy}
        fillHeight={fillHeight}
        maxLength={2000}
        name="descriptions"
      />
    </CatalogLocalePickerProvider>
  )
}

describe("CategoryCatalogLocaleFormField", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders the copy for the active locale and counts the stored value", () => {
    renderWithProviders(
      <CategoryInputHarness
        activeLocale="en-US"
        disabled={false}
        onDefaultLocaleChange={undefined}
        required={false}
        titles={{ ...LOCALE_MAP }}
      />,
    )

    const input = screen.getByPlaceholderText("type the en-US title")

    expect(screen.getByText("Title (en-US)")).toBeInTheDocument()
    expect(input).toHaveValue("Silver rings")
    expect(input).toHaveAttribute("maxlength", "60")
    expect(screen.getByText("12/60")).toBeInTheDocument()
    expect(screen.getByLabelText("hint for en-US")).toBeInTheDocument()
  })

  it("reads the other locale entry of the same map when the picker switches", () => {
    renderWithProviders(
      <CategoryInputHarness
        activeLocale="pl-PL"
        disabled={false}
        onDefaultLocaleChange={undefined}
        required={false}
        titles={{ ...LOCALE_MAP }}
      />,
    )

    expect(screen.getByPlaceholderText("type the pl-PL title")).toHaveValue("Srebrne pierscionki")
    expect(screen.getByText("19/60")).toBeInTheDocument()
  })

  it("appends the required-field hint to the tooltip when the field is required", () => {
    renderWithProviders(
      <CategoryInputHarness activeLocale="en-US" disabled={false} onDefaultLocaleChange={undefined} required titles={{ ...EMPTY_MAP }} />,
    )

    expect(screen.getByLabelText("hint for en-US Required field.")).toBeInTheDocument()
    expect(screen.getByText("0/60")).toBeInTheDocument()
  })

  it("reports typing to the form and to the default-locale listener", async () => {
    const onDefaultLocaleChange = vi.fn<(value: string) => void>()
    renderWithProviders(
      <CategoryInputHarness
        activeLocale="en-US"
        disabled={false}
        onDefaultLocaleChange={onDefaultLocaleChange}
        required={false}
        titles={{ ...EMPTY_MAP }}
      />,
    )

    await userEvent.type(screen.getByPlaceholderText("type the en-US title"), "Ring")

    expect(onDefaultLocaleChange).toHaveBeenLastCalledWith("Ring")
    expect(forms.category?.getValues("titles.en-US")).toBe("Ring")
  })

  it("disables the input without losing its value", () => {
    renderWithProviders(
      <CategoryInputHarness activeLocale="en-US" disabled onDefaultLocaleChange={undefined} required={false} titles={{ ...LOCALE_MAP }} />,
    )

    expect(screen.getByPlaceholderText("type the en-US title")).toBeDisabled()
  })

  it("shows no error row until the form records one", () => {
    renderWithProviders(
      <CategoryInputHarness
        activeLocale="en-US"
        disabled={false}
        onDefaultLocaleChange={undefined}
        required={false}
        titles={{ ...EMPTY_MAP }}
      />,
    )

    expect(screen.getByPlaceholderText("type the en-US title")).toHaveAttribute("aria-invalid", "false")
    expect(screen.queryByRole("alert")).toBeNull()
  })
})

describe("CategoryCatalogLocaleTextareaFormField", () => {
  afterEach(() => {
    cleanup()
  })

  it("defaults to four rows", () => {
    renderWithProviders(<CategoryTextareaHarness rows={undefined} />)

    expect(screen.getByPlaceholderText("type the en-US title")).toHaveAttribute("rows", "4")
  })

  it("honours an explicit row count", () => {
    renderWithProviders(<CategoryTextareaHarness rows={7} />)

    const textarea = screen.getByPlaceholderText("type the en-US title")

    expect(textarea).toHaveAttribute("rows", "7")
    expect(textarea).toHaveAttribute("maxlength", "400")
  })
})

describe("CollectionCatalogLocaleFormField", () => {
  afterEach(() => {
    cleanup()
  })

  it("edits the collection title map for the active locale", async () => {
    const onDefaultLocaleChange = vi.fn<(value: string) => void>()
    renderWithProviders(<CollectionInputHarness onDefaultLocaleChange={onDefaultLocaleChange} />)

    const input = screen.getByPlaceholderText("type the pl-PL title")

    expect(input).toHaveValue("Srebrne pierscionki")

    await userEvent.clear(input)
    await userEvent.type(input, "Wyprzedaz")

    expect(forms.collection?.getValues("titles.pl-PL")).toBe("Wyprzedaz")
    expect(forms.collection?.getValues("titles.en-US")).toBe("Silver rings")
    expect(onDefaultLocaleChange).toHaveBeenLastCalledWith("Wyprzedaz")
  })
})

describe("CollectionCatalogLocaleTextareaFormField", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders the stored description read-only when disabled", () => {
    renderWithProviders(<CollectionTextareaHarness />)

    const textarea = screen.getByPlaceholderText("type the en-US title")

    expect(textarea).toHaveValue("Handmade")
    expect(textarea).toBeDisabled()
    expect(textarea).toHaveAttribute("rows", "9")
    expect(screen.getByText("8/500")).toBeInTheDocument()
  })
})

describe("ProductCatalogLocaleFormField", () => {
  afterEach(() => {
    cleanup()
  })

  it("binds to the product title map for the active locale", () => {
    renderWithProviders(<ProductInputHarness activeLocale="pl-PL" />)

    expect(screen.getByPlaceholderText("type the pl-PL title")).toHaveValue("Srebrne pierscionki")
  })

  it("works without a default-locale listener", async () => {
    renderWithProviders(<ProductInputHarness activeLocale="en-US" />)

    const input = screen.getByPlaceholderText("type the en-US title")

    await userEvent.type(input, "!")

    expect(forms.product?.getValues("titles.en-US")).toBe("Silver rings!")
  })
})

describe("ProductCatalogLocaleTextareaFormField", () => {
  afterEach(() => {
    cleanup()
  })

  it("keeps the fixed row count while it is not filling the sheet", () => {
    renderWithProviders(<ProductTextareaHarness fillHeight={false} />)

    const textarea = screen.getByPlaceholderText("type the en-US title")

    expect(textarea).toHaveAttribute("rows", "4")
    expect(textarea).toHaveValue("Forged by hand")
  })

  it("drops the row count so the textarea can stretch", () => {
    renderWithProviders(<ProductTextareaHarness fillHeight />)

    expect(screen.getByPlaceholderText("type the en-US title")).not.toHaveAttribute("rows")
  })
})
