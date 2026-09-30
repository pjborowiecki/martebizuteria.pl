import { type JSX, type ReactNode } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { FormProvider, useForm } from "react-hook-form"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type ProductFormValues } from "~/src/modules/product/product.zod"

interface LocaleControls {
  activeLocale: SupportedLocale
  clearLocaleSubmitError: () => void
  focusIncompleteLocales: (locales: readonly SupportedLocale[]) => void
  incompleteLocales: readonly SupportedLocale[]
  localeSubmitError: boolean
  setActiveLocale: (locale: SupportedLocale) => void
}

const freshControls = (): LocaleControls => ({
  activeLocale: "pl-PL",
  clearLocaleSubmitError: vi.fn<() => void>(),
  focusIncompleteLocales: vi.fn<(locales: readonly SupportedLocale[]) => void>(),
  incompleteLocales: [],
  localeSubmitError: false,
  setActiveLocale: vi.fn<(locale: SupportedLocale) => void>(),
})

const controls = vi.hoisted((): { current: LocaleControls } => ({
  current: {
    activeLocale: "pl-PL",
    clearLocaleSubmitError: vi.fn<() => void>(),
    focusIncompleteLocales: vi.fn<(locales: readonly SupportedLocale[]) => void>(),
    incompleteLocales: [],
    localeSubmitError: false,
    setActiveLocale: vi.fn<(locale: SupportedLocale) => void>(),
  },
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-locale-controls", () => ({
  useCatalogFormLocaleControls: () => controls.current,
}))

import { ProductFormLocaleLayout } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form-locale-layout"

const titles: { current: ProductFormValues["titles"] } = { current: { "en-US": "", "pl-PL": "" } }

const ProductFormHarness = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => {
  const form = useForm<ProductFormValues>({ defaultValues: { titles: titles.current } })

  return <FormProvider {...form}>{children}</FormProvider>
}

const renderLayout = () =>
  renderWithProviders(
    <ProductFormHarness>
      <ProductFormLocaleLayout>
        <span>Product fields</span>
      </ProductFormLocaleLayout>
    </ProductFormHarness>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  controls.current = freshControls()
  titles.current = { "en-US": "", "pl-PL": "" }
})

afterEach(() => {
  cleanup()
})

describe("ProductFormLocaleLayout", () => {
  it("wraps the product fields in the shared locale picker", () => {
    renderLayout()

    expect(screen.getByText("Product fields")).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Language" })).toHaveTextContent("PL-PL")
  })

  it("counts no filled locale for a blank draft and says what is counted", () => {
    renderLayout()

    expect(screen.getByText("0 of 2 filled")).toBeInTheDocument()
    expect(screen.getByText(/name in each language/u)).toBeInTheDocument()
  })

  it("counts only the locales whose product title carries text", () => {
    titles.current = { "en-US": "   ", "pl-PL": "Srebrny pierścionek" }
    renderLayout()

    expect(screen.getByText("1 of 2 filled")).toBeInTheDocument()
  })

  it("counts both locales once every title is written", () => {
    titles.current = { "en-US": "Silver ring", "pl-PL": "Srebrny pierścionek" }
    renderLayout()

    expect(screen.getByText("2 of 2 filled")).toBeInTheDocument()
  })

  it("follows the editor to the locale they pick", async () => {
    renderLayout()

    await userEvent.click(screen.getByRole("combobox", { name: "Language" }))
    const options = await screen.findAllByRole("option")
    const english = options.find((option) => option.textContent === "EN-US")
    if (english === undefined) {
      throw new Error("the picker offered no English option")
    }

    await userEvent.click(english)

    expect(controls.current.setActiveLocale).toHaveBeenCalledWith("en-US")
  })

  it("stays quiet while no submit has been blocked", () => {
    titles.current = { "en-US": "", "pl-PL": "Srebrny pierścionek" }
    renderLayout()

    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("names the locales still missing a title once a submit was blocked", () => {
    controls.current = { ...controls.current, incompleteLocales: ["en-US"], localeSubmitError: true }
    titles.current = { "en-US": "", "pl-PL": "Srebrny pierścionek" }
    renderLayout()

    expect(screen.getByRole("alert")).toHaveTextContent("Complete required fields for: EN-US.")
  })

  it("clears the blocked submit warning once every locale is filled", () => {
    controls.current = { ...controls.current, incompleteLocales: [], localeSubmitError: true }
    titles.current = { "en-US": "Silver ring", "pl-PL": "Srebrny pierścionek" }
    renderLayout()

    expect(controls.current.clearLocaleSubmitError).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("keeps the warning while a locale is still missing", () => {
    controls.current = { ...controls.current, incompleteLocales: ["en-US"], localeSubmitError: true }
    titles.current = { "en-US": "", "pl-PL": "Srebrny pierścionek" }
    renderLayout()

    expect(controls.current.clearLocaleSubmitError).not.toHaveBeenCalled()
  })
})
