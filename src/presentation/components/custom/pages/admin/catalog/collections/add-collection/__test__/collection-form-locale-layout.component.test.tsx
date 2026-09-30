import { type JSX, type ReactNode } from "react"

import { cleanup, screen } from "@testing-library/react"
import { useForm } from "react-hook-form"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type ProductCollection } from "~/src/modules/product-collection/product-collection.types"

import { CollectionFormLocaleLayout } from "../collection-form-locale-layout"

interface LocaleControls {
  activeLocale: SupportedLocale
  clearLocaleSubmitError: () => void
  focusIncompleteLocales: (locales: readonly SupportedLocale[]) => void
  incompleteLocales: readonly SupportedLocale[]
  localeSubmitError: boolean
  setActiveLocale: (locale: SupportedLocale) => void
}

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

const formHolder: { titles: ProductCollection["formValues"]["titles"] } = { titles: { "en-US": "", "pl-PL": "" } }

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-locale-controls", () => ({
  useCatalogFormLocaleControls: () => controls.current,
}))

const FormControlBridge = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => {
  const form = useForm<ProductCollection["formValues"]>({
    defaultValues: {
      descriptions: { "en-US": "", "pl-PL": "" },
      handle: "",
      image: "",
      status: "draft",
      titles: formHolder.titles,
    },
  })

  return <ControlProvider control={form.control}>{children}</ControlProvider>
}

const ControlProvider = ({ children, control }: Readonly<{ children: ReactNode; control: unknown }>): JSX.Element => {
  bridge.control = control

  return <>{children}</>
}

const bridge: { control?: unknown } = {}

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/collections/add-collection/collection-form-provider", () => ({
  useCollectionForm: () => ({ control: bridge.control }),
}))

const renderLayout = () =>
  renderWithProviders(
    <FormControlBridge>
      <CollectionFormLocaleLayout>
        <span>Collection fields</span>
      </CollectionFormLocaleLayout>
    </FormControlBridge>,
  )

describe("CollectionFormLocaleLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    controls.current = {
      activeLocale: "pl-PL",
      clearLocaleSubmitError: vi.fn<() => void>(),
      focusIncompleteLocales: vi.fn<(locales: readonly SupportedLocale[]) => void>(),
      incompleteLocales: [],
      localeSubmitError: false,
      setActiveLocale: vi.fn<(locale: SupportedLocale) => void>(),
    }
    formHolder.titles = { "en-US": "", "pl-PL": "" }
  })

  afterEach(() => {
    cleanup()
  })

  it("wraps the collection fields in the shared locale picker", () => {
    renderLayout()

    expect(screen.getByText("Collection fields")).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Language" })).toHaveTextContent("PL-PL")
  })

  it("counts no filled locale for a blank draft and explains what is counted", () => {
    renderLayout()

    expect(screen.getByText("0 of 2 filled")).toBeInTheDocument()
    expect(screen.getByText(/name in each language/u)).toBeInTheDocument()
  })

  it("counts only the locales whose title carries text", () => {
    formHolder.titles = { "en-US": "   ", "pl-PL": "Srebrne pierscionki" }
    renderLayout()

    expect(screen.getByText("1 of 2 filled")).toBeInTheDocument()
  })

  it("stays quiet while no submit has been blocked", () => {
    formHolder.titles = { "en-US": "", "pl-PL": "Srebrne pierscionki" }
    renderLayout()

    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("names the locales still missing a title once a submit was blocked", () => {
    controls.current = { ...controls.current, incompleteLocales: ["en-US"], localeSubmitError: true }
    formHolder.titles = { "en-US": "", "pl-PL": "Srebrne pierscionki" }
    renderLayout()

    expect(screen.getByRole("alert")).toHaveTextContent("Complete required fields for: EN-US.")
  })

  it("clears the blocked submit warning once every locale is filled", () => {
    controls.current = { ...controls.current, incompleteLocales: [], localeSubmitError: true }
    formHolder.titles = { "en-US": "Silver rings", "pl-PL": "Srebrne pierscionki" }
    renderLayout()

    expect(controls.current.clearLocaleSubmitError).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("keeps the warning while a locale is still missing", () => {
    controls.current = { ...controls.current, incompleteLocales: ["en-US"], localeSubmitError: true }
    formHolder.titles = { "en-US": "", "pl-PL": "Srebrne pierscionki" }
    renderLayout()

    expect(controls.current.clearLocaleSubmitError).not.toHaveBeenCalled()
  })
})
