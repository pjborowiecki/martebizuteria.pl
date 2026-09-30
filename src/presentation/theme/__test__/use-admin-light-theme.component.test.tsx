import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { THEME_STORAGE_KEY } from "~/src/presentation/theme/theme-init"
import { useAdminLightTheme } from "~/src/presentation/theme/use-admin-light-theme"

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove("dark")
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
  document.documentElement.classList.remove("dark")
})

describe("useAdminLightTheme", () => {
  it("unmounts safely when storage is unavailable", () => {
    const { unmount } = renderHook(() => {
      useAdminLightTheme()
    })
    vi.stubGlobal("localStorage", undefined)

    expect(unmount).not.toThrow()
    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })

  it("unmounts safely when reading the preference is blocked", () => {
    const { unmount } = renderHook(() => {
      useAdminLightTheme()
    })
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Storage is blocked", "SecurityError")
    })

    expect(unmount).not.toThrow()
    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })

  it("forces the admin shell into the light theme", () => {
    document.documentElement.classList.add("dark")

    renderHook(() => {
      useAdminLightTheme()
    })

    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })

  it("leaves an already light shell alone", () => {
    renderHook(() => {
      useAdminLightTheme()
    })

    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })

  it("restores the stored dark storefront theme when the admin shell unmounts", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark")
    document.documentElement.classList.add("dark")
    const { unmount } = renderHook(() => {
      useAdminLightTheme()
    })

    expect(document.documentElement.classList.contains("dark")).toBe(false)
    unmount()

    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })

  it("keeps the shell light on unmount when the shopper chose the light theme", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "light")
    const { unmount } = renderHook(() => {
      useAdminLightTheme()
    })
    unmount()

    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })

  it("keeps the shell light on unmount when no theme was ever stored", () => {
    const { unmount } = renderHook(() => {
      useAdminLightTheme()
    })
    unmount()

    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })

  it("reads the preference under the app scoped storage key", () => {
    localStorage.setItem("some-other-theme", "dark")
    const { unmount } = renderHook(() => {
      useAdminLightTheme()
    })
    unmount()

    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })
})
