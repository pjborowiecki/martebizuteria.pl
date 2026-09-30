import { type JSX, type ReactNode } from "react"

import { cleanup, screen } from "@testing-library/react"
import { useForm } from "react-hook-form"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type ProductCategory } from "~/src/modules/product-category/product-category.types"

interface LocaleControls {
  activeLocale: SupportedLocale
  clearLocaleSubmitError: () => void
  focusIncompleteLocales: (locales: readonly SupportedLocale[]) => void
  incompleteLocales: readonly SupportedLocale[]
  localeSubmitError: boolean
  setActiveLocale: (locale: SupportedLocale) => void
}

const makeControls = (): LocaleControls => ({
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
    clearLocaleSubmitError: () => {},
    focusIncompleteLocales: () => {},
    incompleteLocales: [],
    localeSubmitError: false,
    setActiveLocale: () => {},
  },
}))

const bridge: { control?: unknown } = {}

const formHolder: { titles: Record<string, string> } = { titles: { "en-US": "", "pl-PL": "" } }

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-locale-controls", () => ({
  useCatalogFormLocaleControls: () => controls.current,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/category-form-provider", () => ({
  useCategoryForm: () => ({ control: bridge.control }),
}))

import { CategoryFormLocaleLayout } from "~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/category-form-locale-layout"

const FormControlBridge = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => {
  const form = useForm<ProductCategory["formValues"]>({
    defaultValues: {
      descriptions: { "en-US": "", "pl-PL": "" },
      handle: "",
      image: "",
      parentId: "",
      shortDescriptions: { "en-US": "", "pl-PL": "" },
      status: "draft",
      subtitles: { "en-US": "", "pl-PL": "" },
      titles: formHolder.titles,
    },
  })
  bridge.control = form.control

  return <>{children}</>
}

const renderLayout = () =>
  renderWithProviders(
    <FormControlBridge>
      <CategoryFormLocaleLayout>
        <span>Category fields</span>
      </CategoryFormLocaleLayout>
    </FormControlBridge>,
  )

const setControls = (overrides: Partial<LocaleControls>): void => {
  controls.current = { ...makeControls(), ...overrides }
}

beforeEach(() => {
  vi.clearAllMocks()
  setControls({})
  formHolder.titles = { "en-US": "", "pl-PL": "" }
})

afterEach(() => {
  cleanup()
})

describe("CategoryFormLocaleLayout submit error", () => {
  it("clears the blocked submit warning once both titles are filled", () => {
    setControls({ localeSubmitError: true })
    formHolder.titles = { "en-US": "Rings", "pl-PL": "Pierscionki" }
    renderLayout()

    expect(controls.current.clearLocaleSubmitError).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("keeps the warning while one title is still missing", () => {
    setControls({ incompleteLocales: ["en-US"], localeSubmitError: true })
    formHolder.titles = { "en-US": "", "pl-PL": "Pierscionki" }
    renderLayout()

    expect(controls.current.clearLocaleSubmitError).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent("Complete required fields for: EN-US.")
  })

  it("never clears the warning while no submit was blocked", () => {
    formHolder.titles = { "en-US": "Rings", "pl-PL": "Pierscionki" }
    renderLayout()

    expect(controls.current.clearLocaleSubmitError).not.toHaveBeenCalled()
  })
})
