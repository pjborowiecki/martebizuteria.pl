import { type ReactNode } from "react"

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import {
  CatalogFormLocaleControlsProvider,
  formatCatalogLocaleList,
  useCatalogFormLocaleControls,
} from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-locale-controls"

const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
  <CatalogFormLocaleControlsProvider>{children}</CatalogFormLocaleControlsProvider>
)

describe("formatCatalogLocaleList", () => {
  it("uppercases and joins locales by default", () => {
    expect(formatCatalogLocaleList(["pl-PL", "en-US"])).toBe("PL-PL, EN-US")
  })

  it("returns an empty string for no locales", () => {
    expect(formatCatalogLocaleList([])).toBe("")
  })

  it("uses a supplied formatter", () => {
    expect(formatCatalogLocaleList(["pl-PL", "en-US"], (locale) => locale.slice(0, 2))).toBe("pl, en")
  })
})

describe("useCatalogFormLocaleControls", () => {
  afterEach(() => {
    cleanup()
  })

  it("throws when used outside the provider", () => {
    expect(() => renderHook(() => useCatalogFormLocaleControls())).toThrow(
      "useCatalogFormLocaleControls must be used within CatalogFormLocaleControlsProvider",
    )
  })

  it("starts on the default locale with no submit error", () => {
    const { result } = renderHook(() => useCatalogFormLocaleControls(), { wrapper })

    expect(result.current.activeLocale).toBe(I18N.DEFAULT_LOCALE)
    expect(result.current.incompleteLocales).toStrictEqual([])
    expect(result.current.localeSubmitError).toBe(false)
  })

  it("switches to the first incomplete locale and raises the submit error", () => {
    const { result } = renderHook(() => useCatalogFormLocaleControls(), { wrapper })

    act(() => {
      result.current.focusIncompleteLocales(["en-US", "pl-PL"])
    })

    expect(result.current.activeLocale).toBe("en-US")
    expect(result.current.incompleteLocales).toStrictEqual(["en-US", "pl-PL"])
    expect(result.current.localeSubmitError).toBe(true)
  })

  it("keeps the active locale and raises no error for an empty incomplete list", () => {
    const { result } = renderHook(() => useCatalogFormLocaleControls(), { wrapper })

    act(() => {
      result.current.setActiveLocale("en-US")
    })
    act(() => {
      result.current.focusIncompleteLocales([])
    })

    expect(result.current.activeLocale).toBe("en-US")
    expect(result.current.localeSubmitError).toBe(false)
  })

  it("clears the submit error and the incomplete locales without changing the active locale", () => {
    const { result } = renderHook(() => useCatalogFormLocaleControls(), { wrapper })

    act(() => {
      result.current.focusIncompleteLocales(["en-US"])
    })
    act(() => {
      result.current.clearLocaleSubmitError()
    })

    expect(result.current.activeLocale).toBe("en-US")
    expect(result.current.incompleteLocales).toStrictEqual([])
    expect(result.current.localeSubmitError).toBe(false)
  })

  it("lets the active locale be set directly", () => {
    const { result } = renderHook(() => useCatalogFormLocaleControls(), { wrapper })

    act(() => {
      result.current.setActiveLocale("en-US")
    })

    expect(result.current.activeLocale).toBe("en-US")
  })
})
