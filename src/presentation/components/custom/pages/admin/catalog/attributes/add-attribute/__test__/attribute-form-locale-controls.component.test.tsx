import { type ReactNode } from "react"

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import {
  AttributeFormLocaleControlsProvider,
  useAttributeFormLocaleControls,
} from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-locale-controls"

const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
  <AttributeFormLocaleControlsProvider>{children}</AttributeFormLocaleControlsProvider>
)

const renderControls = () => renderHook(() => useAttributeFormLocaleControls(), { wrapper })

describe("useAttributeFormLocaleControls", () => {
  afterEach(() => {
    cleanup()
  })

  it("refuses to work outside its provider", () => {
    expect(() => renderHook(() => useAttributeFormLocaleControls())).toThrow(
      "useAttributeFormLocaleControls must be used within AttributeFormLocaleControlsProvider",
    )
  })

  it("starts on the default locale with nothing flagged", () => {
    const { result } = renderControls()

    expect(result.current.activeLocale).toBe(I18N.DEFAULT_LOCALE)
    expect(result.current.incompleteLocales).toStrictEqual([])
    expect(result.current.localeSubmitError).toBe(false)
  })

  it("follows the locale the editor picks", () => {
    const { result } = renderControls()

    act(() => {
      result.current.setActiveLocale("en-US")
    })

    expect(result.current.activeLocale).toBe("en-US")
  })

  it("jumps to the first incomplete locale and raises the submit error", () => {
    const { result } = renderControls()

    act(() => {
      result.current.focusIncompleteLocales(["en-US", "pl-PL"])
    })

    expect(result.current.activeLocale).toBe("en-US")
    expect(result.current.incompleteLocales).toStrictEqual(["en-US", "pl-PL"])
    expect(result.current.localeSubmitError).toBe(true)
  })

  it("leaves the active locale alone when nothing is incomplete", () => {
    const { result } = renderControls()

    act(() => {
      result.current.setActiveLocale("en-US")
    })
    act(() => {
      result.current.focusIncompleteLocales([])
    })

    expect(result.current.activeLocale).toBe("en-US")
    expect(result.current.localeSubmitError).toBe(false)
    expect(result.current.incompleteLocales).toStrictEqual([])
  })

  it("clears the flags without moving the editor away from the locale being fixed", () => {
    const { result } = renderControls()

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
})
