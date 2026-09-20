import { useEffect } from "react"

import { THEME_STORAGE_KEY } from "~/src/presentation/theme/theme-init"

/** Keeps the admin shell on a light canvas while the storefront may use dark mode. */
export const useAdminLightTheme = (): void => {
  useEffect(() => {
    document.documentElement.classList.remove("dark")
    return function restoreStorefrontTheme() {
      if (typeof localStorage === "undefined") {
        return
      }
      try {
        if (globalThis.localStorage.getItem(THEME_STORAGE_KEY) === "dark") {
          document.documentElement.classList.add("dark")
        }
      } catch {
        // LocalStorage may be unavailable
      }
    }
  }, [])
}
